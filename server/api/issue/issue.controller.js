/**
 * GET     /api/issues                        ->  index
 * POST    /api/issues                        ->  create
 * GET     /api/issues/attachments/:attachmentId ->  serveAttachment
 * GET     /api/issues/:id                    ->  show
 * POST    /api/issues/:id/comments           ->  addComment
 * POST    /api/issues/:id/attachments        ->  addAttachments
 * PUT     /api/issues/:id                    ->  update
 * PATCH   /api/issues/:id                    ->  update
 */

'use strict';

import _ from 'lodash';
import fs from 'fs';
import './issue.events';
import {Issue, IssueComment, IssueAttachment} from '../../sqldb';
import {
  writeAttachmentFiles,
  resolveAttachmentPath,
  safeOriginalName
} from './issue.storage';
import {buildAgentSummaryMarkdown} from './issue.agentSummary';

var ADMIN_ROLES = ['admin', 'superadmin'];

function parseId(raw) {
  var id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    console.error(err);
    var message = (err && err.message) ? err.message : String(err);
    res.status(statusCode).send({message: message});
  };
}

function isAdminUser(user) {
  return user && user.role && ADMIN_ROLES.indexOf(user.role) >= 0;
}

function pickCreateBody(body, user) {
  var picked = _.pick(body, ['kind', 'title', 'description', 'priority', 'reporterName']);
  picked.reporterName = picked.reporterName || user.name;
  picked.reporterUserId = user._id;
  if (!picked.kind) {
    picked.kind = 'bug';
  }
  if (!picked.priority) {
    picked.priority = 'medium';
  }
  return picked;
}

function pickUpdateBody(body, user) {
  if (isAdminUser(user)) {
    return _.pick(body, [
      'kind', 'title', 'description', 'priority', 'status', 'developerApproved'
    ]);
  }
  return _.pick(body, ['title', 'description']);
}

function decodeUploadPayload(body) {
  var list = body && body.files;
  if (!Array.isArray(list)) {
    return [];
  }
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i] || {};
    var data = item.data;
    if (!data) {
      continue;
    }
    var base64 = String(data);
    var comma = base64.indexOf(',');
    if (comma >= 0) {
      base64 = base64.slice(comma + 1);
    }
    var buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      continue;
    }
    var mimeType = item.mimeType || item.type || 'image/png';
    var originalName = safeOriginalName(item.name || item.originalName || 'screenshot.png');
    if (!/\.[a-z0-9]+$/i.test(originalName)) {
      var ext = mimeType.indexOf('jpeg') >= 0 ? '.jpg' : '.png';
      originalName += ext;
    }
    out.push({
      buffer: buffer,
      mimeType: mimeType,
      originalName: originalName
    });
  }
  return out;
}

function loadIssueDetail(issueId) {
  return Issue.findOne({
    where: {
      _id: issueId
    }
  }).then(function(issue) {
    if (!issue) {
      return null;
    }
    return Promise.all([
      IssueComment.findAll({
        where: {issueId: issue._id},
        order: [['_id', 'ASC']]
      }),
      IssueAttachment.findAll({
        where: {issueId: issue._id},
        order: [['_id', 'ASC']]
      })
    ]).then(function(results) {
      var json = issue.toJSON();
      json.comments = results[0].map(function(c) {
        return c.toJSON();
      });
      json.attachments = results[1].map(function(a) {
        return a.toJSON();
      });
      return json;
    });
  });
}

export function index(req, res) {
  return Issue.findAll({order: [['_id', 'DESC']]})
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function show(req, res) {
  var issueId = parseId(req.params.id);
  if (issueId === null) {
    res.status(400).send({message: 'Invalid issue id'});
    return null;
  }
  return loadIssueDetail(issueId)
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function create(req, res) {
  var data = pickCreateBody(req.body, req.user);
  if (!data.title || !data.reporterName) {
    res.status(400).send({message: 'title and reporterName are required'});
    return null;
  }
  return Issue.create(data)
    .then(function(issue) {
      var files = decodeUploadPayload(req.body);
      if (!files.length) {
        return issue;
      }
      return saveAttachmentsForIssue(issue._id, files).then(function() {
        return issue;
      });
    })
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

function saveAttachmentsForIssue(issueId, files) {
  var written = writeAttachmentFiles(issueId, files);
  if (!written.length) {
    return Promise.resolve();
  }
  return Promise.all(written.map(function(meta) {
    return IssueAttachment.create({
      issueId: issueId,
      originalName: meta.originalName,
      storedName: meta.storedName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes
    });
  })).then(function() {
    return Issue.findOne({where: {_id: issueId}});
  }).then(function(issue) {
    if (issue) {
      return issue.update({title: issue.title});
    }
    return null;
  });
}

export function addAttachments(req, res) {
  var issueId = parseId(req.params.id);
  if (issueId === null) {
    res.status(400).send({message: 'Invalid issue id'});
    return null;
  }
  var files = decodeUploadPayload(req.body);
  if (!files.length) {
    res.status(400).send({message: 'No image data in request'});
    return null;
  }
  return Issue.findOne({where: {_id: issueId}})
    .then(handleEntityNotFound(res))
    .then(function(issue) {
      if (!issue) {
        return null;
      }
      return saveAttachmentsForIssue(issueId, files).then(function() {
        return loadIssueDetail(issueId);
      });
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function serveAttachment(req, res) {
  var attachmentId = parseId(req.params.attachmentId);
  if (attachmentId === null) {
    res.status(400).send({message: 'Invalid attachment id'});
    return null;
  }
  return IssueAttachment.findOne({where: {_id: attachmentId}})
    .then(handleEntityNotFound(res))
    .then(function(attachment) {
      if (!attachment) {
        return null;
      }
      var filePath = resolveAttachmentPath(attachment);
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).end();
        return null;
      }
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + attachment.originalName.replace(/"/g, '') + '"'
      );
      res.sendFile(filePath);
      return null;
    })
    .catch(handleError(res));
}

export function addComment(req, res) {
  var issueId = parseId(req.params.id);
  if (issueId === null) {
    res.status(400).send({message: 'Invalid issue id'});
    return null;
  }
  var body = (req.body && req.body.body) ? String(req.body.body).trim() : '';
  if (!body) {
    res.status(400).send({message: 'body is required'});
    return null;
  }
  return Issue.findOne({
    where: {
      _id: issueId
    }
  })
    .then(handleEntityNotFound(res))
    .then(function(issue) {
      if (!issue) {
        return null;
      }
      return IssueComment.create({
        issueId: issue._id,
        body: body,
        authorName: (req.body.authorName || req.user.name),
        authorUserId: req.user._id
      });
    })
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

export function update(req, res) {
  var issueId = parseId(req.params.id);
  if (issueId === null) {
    res.status(400).send({message: 'Invalid issue id'});
    return null;
  }
  if (req.body._id) {
    delete req.body._id;
  }
  var updates = pickUpdateBody(req.body, req.user);
  return Issue.findOne({
    where: {
      _id: issueId
    }
  })
    .then(handleEntityNotFound(res))
    .then(function(issue) {
      if (!issue) {
        return null;
      }
      return issue.update(updates);
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function agentSummary(req, res) {
  return buildAgentSummaryMarkdown()
    .then(function(markdown) {
      res.type('text/markdown').send(markdown);
    })
    .catch(handleError(res));
}
