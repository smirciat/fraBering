'use strict';

(function() {

var REPORTER_NAME_KEY = 'fraBering_issueReporterName';

var STATUS_LABELS = {
  open: 'Open',
  needs_clarification: 'Needs clarification',
  in_progress: 'In progress',
  ready_for_review: 'Ready for review',
  done: 'Done',
  closed: 'Closed'
};

class IssuesComponent {
  constructor($http, socket, Auth, $stateParams, $scope) {
    this.http = $http;
    this.socket = socket;
    this.Auth = Auth;
    this.$scope = $scope;
    this.issueList = [];
    this.selected = null;
    this.showNewForm = false;
    this.saving = false;
    this.savingComment = false;
    this.uploading = false;
    this.newComment = '';
    this.emailReporter = false;
    this.emailDeveloper = false;
    this.pendingNewFiles = [];
    this.pasteFeedback = '';
    this.kinds = ['bug', 'feature', 'question'];
    this.priorities = ['low', 'medium', 'high', 'critical'];
    this.statuses = Object.keys(STATUS_LABELS);
    this.isAdmin = false;

    this.newIssue = {
      kind: 'bug',
      title: '',
      description: '',
      priority: 'medium',
      reporterName: ''
    };

    var self = this;
    Auth.getCurrentUser(function(user) {
      if (user && user.name) {
        self.isAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (!self.newIssue.reporterName) {
          self.newIssue.reporterName = window.localStorage.getItem(REPORTER_NAME_KEY) || user.name;
        }
      }
    });

    this.loadList().then(function() {
      if ($stateParams.issueId) {
        self.selectById($stateParams.issueId);
      }
    });

    this.socket.syncUpdates('issue', this.issueList, function(event, item) {
      self.$scope.$applyAsync(function() {
        if (self.selected && item && self.selected._id === item._id) {
          self.refreshSelected(item._id);
        }
      });
    });
  }

  upsertIssueInList(issue) {
    if (!issue || issue._id == null) {
      return;
    }
    var plain = angular.copy(issue);
    delete plain.comments;
    delete plain.attachments;
    var idx = _.findIndex(this.issueList, {_id: plain._id});
    if (idx >= 0) {
      this.issueList.splice(idx, 1, plain);
    } else {
      this.issueList.unshift(plain);
    }
  }

  $onDestroy() {
    this.socket.unsyncUpdates('issue');
    this.revokePendingPreviews();
  }

  statusLabel(status) {
    return STATUS_LABELS[status] || (status || 'open');
  }

  attachmentUrl(attachmentId) {
    return '/api/issues/attachments/' + attachmentId;
  }

  isClosed(issue) {
    return !!(issue && (issue.status === 'done' || issue.status === 'closed'));
  }

  reporterName(issue) {
    return issue && issue.reporterName ? issue.reporterName : '';
  }

  reporterRepliedIssue(issue) {
    if (!issue) {
      return false;
    }
    if (issue.reporterRepliedLast) {
      return true;
    }
    var watchStatuses = ['needs_clarification', 'ready_for_review', 'done', 'closed'];
    if (watchStatuses.indexOf(issue.status) < 0) {
      return false;
    }
    var comments = issue.comments;
    if (!comments || !comments.length) {
      return false;
    }
    var reporter = String(issue.reporterName || '').trim().toLowerCase();
    if (!reporter) {
      return false;
    }
    var last = comments[comments.length - 1];
    return String(last.authorName || '').trim().toLowerCase() === reporter;
  }

  toggleNewForm() {
    this.showNewForm = !this.showNewForm;
    if (!this.showNewForm) {
      this.revokePendingPreviews();
      this.pendingNewFiles = [];
    }
  }

  revokePendingPreviews() {
    if (!this.pendingNewFiles) {
      return;
    }
    this.pendingNewFiles.forEach(function(file) {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
  }

  loadList() {
    var self = this;
    return this.http.get('/api/issues').then(function(res) {
      self.issueList = res.data || [];
    });
  }

  selectById(id) {
    var numId = parseInt(id, 10);
    var match = _.find(this.issueList, {_id: numId});
    if (match) {
      this.selectIssue(match);
    } else {
      this.refreshSelected(numId);
    }
  }

  selectIssue(issue) {
    var self = this;
    this.http.get('/api/issues/' + issue._id).then(function(res) {
      self.selected = res.data;
    });
  }

  refreshSelected(id) {
    var self = this;
    this.http.get('/api/issues/' + id).then(function(res) {
      self.selected = res.data;
      var plain = angular.copy(res.data);
      delete plain.comments;
      delete plain.attachments;
      plain.reporterRepliedLast = self.reporterRepliedIssue(res.data);
      self.upsertIssueInList(plain);
    });
  }

  onPasteNew(event) {
    var self = this;
    if (!this.collectClipboardImages(event, function(files) {
      files.forEach(function(file) {
        self.pendingNewFiles.push(file);
      });
      if (event.target) {
        event.target.value = '';
      }
      self.pasteFeedback = '';
    })) {
      this.pasteFeedback =
        'No image on clipboard. Use Print Screen or Snipping Tool, click the box, then Ctrl+V (or right-click Paste).';
    }
  }

  onPasteDetail(event) {
    var self = this;
    if (!this.selected) {
      return;
    }
    if (!this.collectClipboardImages(event, function(files) {
      self.uploadFilesToIssue(self.selected._id, files);
    })) {
      this.pasteFeedback =
        'No image on clipboard. Use Print Screen or Snipping Tool, click the box, then Ctrl+V (or right-click Paste).';
    }
  }

  isAllowedIssueAttachmentBlob(blob, declaredType) {
    if (!blob || !blob.size) {
      return false;
    }
    var type = (blob.type || declaredType || '').toLowerCase();
    if (type.indexOf('image/') === 0) {
      return true;
    }
    if (
      type.indexOf('spreadsheetml') >= 0 ||
      type.indexOf('ms-excel') >= 0 ||
      type === 'application/pdf'
    ) {
      return true;
    }
    var name = (blob.name || '').toLowerCase();
    if (/\.(xlsx|xls|pdf)$/.test(name)) {
      return true;
    }
    if (!type || type === 'application/octet-stream') {
      return blob.size > 64 && /\.(png|jpe?g|gif|webp|xlsx|xls|pdf)$/i.test(name);
    }
    return false;
  }

  collectClipboardImages(event, done) {
    var clipboard = event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData);
    if (!clipboard) {
      return false;
    }
    var blobs = [];
    var seen = {};

    function addBlob(blob, declaredType) {
      if (!blob || !self.isAllowedIssueAttachmentBlob(blob, declaredType)) {
        return;
      }
      var key = blob.size + ':' + (blob.type || declaredType || '');
      if (seen[key]) {
        return;
      }
      seen[key] = true;
      blobs.push(blob);
    }

    var self = this;
    if (clipboard.files && clipboard.files.length) {
      for (var f = 0; f < clipboard.files.length; f++) {
        addBlob.call(self, clipboard.files[f], clipboard.files[f].type);
      }
    }
    if (clipboard.items && clipboard.items.length) {
      for (var i = 0; i < clipboard.items.length; i++) {
        var item = clipboard.items[i];
        if (item.kind && item.kind !== 'file') {
          continue;
        }
        var blob = item.getAsFile();
        addBlob.call(self, blob, item.type);
      }
    }
    if (!blobs.length) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    var pending = blobs.length;
    var collected = [];
    blobs.forEach(function(blob) {
      self.blobToUploadPayload(blob, function(payload) {
        collected.push(payload);
        pending -= 1;
        if (pending === 0) {
          self.$scope.$evalAsync(function() {
            done(collected);
          });
        }
      });
    });
    return true;
  }

  blobToUploadPayload(blob, callback) {
    var reader = new FileReader();
    var stamp = Date.now();
    var defaultName = 'screenshot-' + stamp + '.png';
    var fileName = blob.name || defaultName;
    reader.onload = function() {
      var mimeType = blob.type || 'image/png';
      var previewUrl = mimeType.indexOf('image/') === 0 ? URL.createObjectURL(blob) : '';
      callback({
        name: fileName,
        mimeType: mimeType,
        data: reader.result,
        previewUrl: previewUrl
      });
    };
    reader.readAsDataURL(blob);
  }

  handleFileInput(inputEl, mode) {
    if (!inputEl || !inputEl.files || !inputEl.files.length) {
      return;
    }
    var self = this;
    this.collectFilesFromInput(inputEl, function(files) {
      if (mode === 'new') {
        files.forEach(function(file) {
          self.pendingNewFiles.push(file);
        });
        self.pasteFeedback = '';
      } else if (mode === 'detail' && self.selected) {
        self.uploadFilesToIssue(self.selected._id, files);
      }
    });
    inputEl.value = '';
  }

  collectFilesFromInput(input, done) {
    if (!input || !input.files || !input.files.length) {
      return;
    }
    var self = this;
    var blobs = [];
    for (var i = 0; i < input.files.length; i++) {
      var blob = input.files[i];
      if (this.isAllowedIssueAttachmentBlob(blob, blob.type)) {
        blobs.push(blob);
      }
    }
    if (!blobs.length) {
      this.pasteFeedback = 'That file type is not supported. Use images, PDF, or Excel (.xlsx/.xls).';
      return;
    }
    var pending = blobs.length;
    var collected = [];
    blobs.forEach(function(blob) {
      self.blobToUploadPayload(blob, function(payload) {
        collected.push(payload);
        pending -= 1;
        if (pending === 0) {
          self.$scope.$evalAsync(function() {
            done(collected);
          });
        }
      });
    });
  }

  isImageAttachment(file) {
    return file && file.mimeType && file.mimeType.indexOf('image/') === 0;
  }

  uploadFilesToIssue(issueId, files) {
    var self = this;
    if (!files || !files.length) {
      return;
    }
    this.uploading = true;
    var payload = {
      files: files.map(function(f) {
        return {
          name: f.name,
          mimeType: f.mimeType,
          data: f.data
        };
      })
    };
    this.http.post('/api/issues/' + issueId + '/attachments', payload).then(function(res) {
      self.uploading = false;
      self.selected = res.data;
      self.pasteFeedback = '';
    }, function(err) {
      self.uploading = false;
      var status = err && err.status;
      if (status === 413) {
        self.pasteFeedback = 'Upload too large for the server proxy (ask admin to raise nginx client_max_body_size).';
      } else {
        self.pasteFeedback = 'Attachment upload failed. Try again or use a smaller file.';
      }
    });
  }

  submitNew() {
    var self = this;
    if (!this.newIssue.title || !this.newIssue.reporterName) {
      return;
    }
    this.saving = true;
    window.localStorage.setItem(REPORTER_NAME_KEY, this.newIssue.reporterName);
    var body = angular.copy(this.newIssue);
    if (this.pendingNewFiles.length) {
      body.files = this.pendingNewFiles.map(function(f) {
        return {
          name: f.name,
          mimeType: f.mimeType,
          data: f.data
        };
      });
    }
    this.http.post('/api/issues', body).then(function(res) {
      self.saving = false;
      self.showNewForm = false;
      self.revokePendingPreviews();
      self.pendingNewFiles = [];
      self.newIssue.title = '';
      self.newIssue.description = '';
      self.upsertIssueInList(res.data);
      self.refreshSelected(res.data._id);
    }, function() {
      self.saving = false;
    });
  }

  saveIssue() {
    if (!this.selected || !this.isAdmin) {
      return;
    }
    var self = this;
    var payload = _.pick(this.selected, [
      'kind', 'title', 'description', 'priority', 'status', 'developerApproved'
    ]);
    return this.http.patch('/api/issues/' + this.selected._id, payload).then(function(res) {
      if (res.data) {
        self.selected.status = res.data.status;
        self.selected.priority = res.data.priority;
        self.selected.developerApproved = res.data.developerApproved;
        self.upsertIssueInList(self.selected);
      }
    });
  }

  reopenIssue() {
    if (!this.selected || !this.isAdmin || !this.isClosed(this.selected)) {
      return;
    }
    this.selected.status = 'open';
    this.saveIssue();
  }

  submitComment() {
    var self = this;
    var body = (this.newComment || '').trim();
    if (!this.selected || !body) {
      return;
    }
    this.savingComment = true;
    var payload = {
      body: body,
      emailReporter: !!this.emailReporter,
      emailDeveloper: !!this.emailDeveloper
    };
    this.http.post('/api/issues/' + this.selected._id + '/comments', payload)
      .then(function() {
        self.newComment = '';
        self.emailReporter = false;
        self.emailDeveloper = false;
        self.savingComment = false;
        self.refreshSelected(self.selected._id);
      }, function() {
        self.savingComment = false;
      });
  }
}

angular.module('workspaceApp')
  .component('issues', {
    templateUrl: 'app/issues/issues.html',
    controller: IssuesComponent,
    controllerAs: 'issues',
    authenticate: 'user'
  });

})();

angular.module('workspaceApp')
  .component('issuesPasteArea', {
    bindings: {
      onPaste: '&'
    },
    template:
      '<textarea class="issues-paste-zone" rows="2" ' +
      'placeholder="Click here, then paste a screenshot (Ctrl+V / Cmd+V)"></textarea>',
    controller: function($element, $scope) {
      var ctrl = this;
      var textarea;

      this.$postLink = function() {
        textarea = $element[0].querySelector('textarea');
        if (!textarea) {
          return;
        }
        textarea.addEventListener('paste', onPaste);
        textarea.addEventListener('click', focusTextarea);
      };

      this.$onDestroy = function() {
        if (!textarea) {
          return;
        }
        textarea.removeEventListener('paste', onPaste);
        textarea.removeEventListener('click', focusTextarea);
      };

      function focusTextarea() {
        textarea.focus();
      }

      function onPaste(event) {
        // Read clipboard synchronously — deferring clears clipboardData in many browsers (esp. HTTPS/prod).
        ctrl.onPaste({$event: event});
      }
    }
  });
