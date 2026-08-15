'use strict';

(function(){

class RotPilotEvalsComponent {
  constructor($http) {
    this.http = $http;
    this.currentPilot = '';
  }

  $onInit() {
    this.http.get('/api/rot/evaluations').then(res => {
      this.evals = res.data.filter(evaluation => !evaluation.isArchived);
      this.evals.forEach(evaluation => {
        evaluation.date = new Date(evaluation.Date_af_date).toLocaleDateString();
      });
      this.filterEvals();
      this.pilotNames = [];
      this.evals.forEach(evaluation => {
        if (this.pilotNames.indexOf(evaluation.Pilot_Name) === -1) {
          this.pilotNames.push(evaluation.Pilot_Name);
        }
      });
    });
  }

  filterEvals() {
    this.filteredEvals = this.evals.filter(evaluation => {
      return evaluation.Pilot_Name === this.currentPilot;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    let hrs = 0;
    this.filteredEvals.forEach(evaluation => {
      hrs += evaluation.Hours * 1;
      evaluation.cumHours = hrs;
    });
  }

  deleteEval(evaluation, index) {
    this.http.patch('/api/rot/evaluations/' + evaluation._id, {isArchived: true}).then(() => {
      this.filteredEvals.splice(index, 1);
    });
  }

  viewEval(evaluation) {
    this.http({
      url: '/api/rot/files/attachments?filename=' + encodeURIComponent(evaluation.filename),
      method: 'GET',
      responseType: 'arraybuffer'
    }).then(response => {
      let blob = new Blob([response.data], {type: 'application/pdf'});
      let fileURL = URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
    }).catch(() => {
      alert('File Not Found');
    });
  }
}

angular.module('workspaceApp')
  .component('rotPilotEvals', {
    templateUrl: 'app/rot/pilotEvals/pilotEvals.html',
    controller: RotPilotEvalsComponent,
    controllerAs: 'rotPilotEvals'
  });

})();
