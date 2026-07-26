'use strict';

import {Op} from 'sequelize';
import {Issue, IssueComment, IssueAttachment} from '../../sqldb';

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

function formatIssueBlock(issue, extraMeta) {
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
    block.push(issue.description);
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
      block.push(
        '- ' + file.originalName + ' (GET /api/issues/attachments/' + file._id + ')'
      );
    });
  }

  block.push('');
  return block;
}

export function buildAgentSummaryMarkdown() {
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
        lines = lines.concat(formatIssueBlock(issue));
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
        lines = lines.concat(formatIssueBlock(issue, ['**Status:** ready for review']));
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
        lines = lines.concat(formatIssueBlock(issue, ['**Status:** needs clarification']));
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
