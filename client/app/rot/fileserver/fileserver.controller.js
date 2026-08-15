'use strict';

(function(){

class RotFileserverComponent {
  constructor($http, $interval, $timeout, Auth) {
    this.http = $http;
    this.interval = $interval;
    this.timeout = $timeout;
    this.Auth = Auth;
    this.fileInputId = 'rot-fileserver-input';
    this.fileList = [];
  }

  $onInit() {
    if (!this.loggedIn()) return;
    this.refreshList();
    this.uploadWatch = this.interval(() => {
      let input = document.getElementById(this.fileInputId);
      if (input && input.files && input.files.length > 0) this.add();
    }, 1000);
  }

  $onDestroy() {
    if (this.uploadWatch) this.interval.cancel(this.uploadWatch);
  }

  loggedIn() {
    return this.Auth && this.Auth.isLoggedIn();
  }

  refreshList() {
    this.http.post('/api/rot/listFileserver', {}).then(res => {
      if (!res.data) return;
      this.fileList = JSON.parse(res.data);
    });
  }

  download(filename) {
    this.http({
      url: '/api/rot/files/fileserver?filename=' + encodeURIComponent(filename),
      method: 'GET',
      responseType: 'arraybuffer'
    }).then(response => {
      let blob = new Blob([response.data]);
      saveAs(blob, filename);
    }).catch(() => {
      window.alert('File not found');
    });
  }

  delete(filename) {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    this.http.post('/api/rot/deleteFileserver', {filename: filename}).then(() => {
      this.refreshList();
    });
  }

  add() {
    let input = document.getElementById(this.fileInputId);
    if (!input || !input.files || !input.files.length) return;
    let files = Array.from(input.files);
    files.forEach(f => {
      let reader = new FileReader();
      reader.onloadend = e => {
        this.http.post('/api/rot/uploadFileserver', {
          data: btoa(e.target.result),
          filename: f.name
        }).then(() => {
          this.timeout(() => {
            this.refreshList();
          }, 500);
          input.value = '';
        }).catch(err => {
          console.log(err);
          window.alert('Upload failed');
        });
      };
      reader.readAsBinaryString(f);
    });
  }
}

angular.module('workspaceApp')
  .component('rotFileserver', {
    templateUrl: 'app/rot/fileserver/fileserver.html',
    controller: RotFileserverComponent,
    controllerAs: 'rotFileserver'
  });

})();
