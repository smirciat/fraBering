'use strict';

import {Op} from 'sequelize';
import {Issue, IssueComment, IssueAttachment} from '../../sqldb';

var DEFAULT_IMAGE_BASE = 'team-backlog/attachments';

function sortIssues(rows) {
  return rows.slice().sort(function(a, b) {
    var pri = {critical: 0, high: 1, medium: 2, low: 3};
    var pa = pri[a.priority] != null ? pri[a.priority] : 9;
    var pb = pri[b.priority] != null ? pri[b.priority] : 9;
    if (pa !== pb) {
      return pa - pb;
    }
    return b._id - a._id;
  });
}

function loadIssuesWithDetails(where) {
  return Issue.findAll({
    where: where,
    order: [['_id', 'DESC']]
  }).then(function(issues) {
    return Promise.all(issues.map(function(issue) {
      return Promise.all([
        IssueComment.findAll({
          where: {issueId: issue._id},
          order: [['_id', 'ASC']]
        }),
        IssueAttachment.findAll({
          where: {issueId: issue._id},
          order: [['_id', 'ASC']]
        })
      ]).then(function(parts) {
        var json = issue.toJSON();
        json.comments = parts[0].map(function(c) {
          return c.toJSON();
        });
        json.attachments = parts[1].map(function(a) {
          return a.toJSON();
        });
        return json;
      });
    }));
  });
}

function isImageAttachment(file) {
  if (file.mimeType && String(file.mimeType).indexOf('image/') === 0) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp)$/i.test(file.originalName || '');
}

function attachmentRelativePath(issueId, file, imageBasePath) {
  var safe = String(file.originalName || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return imageBasePath + '/issue-' + issueId + '-att-' + file._id + '-' + safe;
}

function registerAttachment(manifest, attachmentId, relativePath) {
  if (!manifest) {
    return;
  }
  var exists = manifest.some(function(entry) {
    return entry.attachmentId === attachmentId;
  });
  if (!exists) {
    manifest.push({attachmentId: attachmentId, relativePath: relativePath});
  }
}

function shouldShowProgress(issue) {
  if (issue.status === 'in_progress') {
    return true;
  }
  if (issue.status === 'open' && issue.comments && issue.comments.length) {
    return true;
  }
  return false;
}

function formatIssueBlock(issue, extraMeta, options) {
  options = options || {};
  var imageBasePath = options.imageBasePath;
  var attachmentManifest = options.attachmentManifest;

  var flags = [issue.kind, issue.priority, issue.status].filter(Boolean).join(' · ');
  var block = [
    '## #' + issue._id + ' ' + issue.title,
    '',
    '- **Type:** ' + flags,
    '- **Reporter:** ' + issue.reporterName
  ];

  if (extraMeta && extraMeta.length) {
    extraMeta.forEach(function(line) {
      block.push('- ' + line);
    });
  }

  if (issue.description) {
    block.push('');
    block.push('**Original report:**');
    block.push('');
    block.push(issue.description);
  }

  if (shouldShowProgress(issue) && issue.comments && issue.comments.length) {
    var latest = issue.comments[issue.comments.length - 1];
    block.push('');
    block.push('**Progress (changed, not resolved):**');
    block.push('');
    block.push(latest.authorName + ': ' + latest.body);

    if (issue.attachments && issue.attachments.length && imageBasePath) {
      var images = issue.attachments.filter(isImageAttachment);
      if (images.length) {
        var newest = images[images.length - 1];
        var rel = attachmentRelativePath(issue._id, newest, imageBasePath);
        registerAttachment(attachmentManifest, newest._id, rel);
        block.push('');
        block.push('**Latest screenshot:**');
        block.push('');
        block.push('![' + newest.originalName + '](' + rel + ')');
      }
    }
  }

  if (issue.comments && issue.comments.length) {
    block.push('');
    block.push('**Comments:**');
    issue.comments.forEach(function(comment) {
      block.push('- ' + comment.authorName + ': ' + comment.body);
    });
  }

  if (issue.attachments && issue.attachments.length) {
    block.push('');
    block.push('**Attachments:**');
    issue.attachments.forEach(function(file) {
      if (imageBasePath && isImageAttachment(file)) {
        var path = attachmentRelativePath(issue._id, file, imageBasePath);
        registerAttachment(attachmentManifest, file._id, path);
        block.push('- ![' + file.originalName + '](' + path + ')');
      } else {
        block.push(
          '- ' + file.originalName + ' (GET /api/issues/attachments/' + file._id + ')'
        );
      }
    });
  }

  block.push('');
  return block;
}

function buildMarkdownFromSections(formatBlock) {
  return Promise.all([
    loadIssuesWithDetails({
      developerApproved: true,
      status: {[Op.in]: ['open', 'in_progress']}
    }),
    loadIssuesWithDetails({
      developerApproved: true,
      status: 'ready_for_review'
    }),
    loadIssuesWithDetails({
      status: 'needs_clarification'
    })
  ]).then(function(sections) {
    var backlogRows = sortIssues(sections[0]);
    var reviewRows = sortIssues(sections[1]);
    var clarificationRows = sortIssues(sections[2]);

    var lines = [
      '# FRA team backlog (issues)',
      '',
      '_Generated from fraBering `/api/issues`. Regenerate: `node scripts/export-team-backlog/index.js`._',
      '',
      '## Active (developer approved — build queue)',
      '',
      '_Developer-approved, open or in progress. Agents should implement these._',
      ''
    ];

    if (!backlogRows.length) {
      lines.push('_No approved backlog items right now._', '');
    } else {
      backlogRows.forEach(function(issue) {
        lines = lines.concat(formatBlock(issue));
      });
    }

    lines.push(
      '## Ready for review (shipped — reporter verify, do not build)',
      '',
      '_Waiting for reporter sign-off in the app._',
      ''
    );

    if (!reviewRows.length) {
      lines.push('_None._', '');
    } else {
      reviewRows.forEach(function(issue) {
        lines = lines.concat(formatBlock(issue, ['**Status:** ready for review']));
      });
    }

    lines.push(
      '## Needs clarification (radar — do not build)',
      '',
      '_Waiting on reporter answers in comments._',
      ''
    );

    if (!clarificationRows.length) {
      lines.push('_None._', '');
    } else {
      clarificationRows.forEach(function(issue) {
        lines = lines.concat(formatBlock(issue, ['**Status:** needs clarification']));
      });
    }

    lines.push(
      '## Out of scope for agents',
      '',
      '- **Done** / **closed** — not listed here.',
      '- Items without **Developer approved** — triage in `/issues` first.',
      ''
    );

    return lines.join('\n');
  });
}

export function buildAgentSummaryMarkdown() {
  return buildMarkdownFromSections(function(issue, extraMeta) {
    return formatIssueBlock(issue, extraMeta, {});
  });
}

export function buildAgentExportBundle() {
  var attachmentManifest = [];
  var options = {
    imageBasePath: DEFAULT_IMAGE_BASE,
    attachmentManifest: attachmentManifest
  };
  return buildMarkdownFromSections(function(issue, extraMeta) {
    return formatIssueBlock(issue, extraMeta, options);
  }).then(function(markdown) {
    return {
      markdown: markdown,
      attachments: attachmentManifest
    };
  });
}
