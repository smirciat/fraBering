'use strict';

(function(){

const APPROVAL_EMAILS = [
  'fen@beringair.com',
  'nathaniel@beringair.com',
  'nathanielwkolson@gmail.com',
  'smirciat@gmail.com',
  'kalebjanke@gmail.com'
];

class RotPilotSelectorComponent {
  constructor(RotPilotContext, $http, Auth, $scope) {
    this.RotPilotContext = RotPilotContext;
    this.http = $http;
    this.Auth = Auth;
    this.scope = $scope;
    this.pilots = [];
    this.pilot = null;
    this.legalNameEdit = '';
    this.canEditLegalName = false;
  }

  pilotFromList(chosen) {
    if (!chosen) return null;
    let idx = this.pilots.map(e => e._id).indexOf(chosen._id);
    if (idx > -1) return this.pilots[idx];
    return chosen;
  }

  syncLegalNameFromPilot(pilot) {
    this.pilot = pilot;
    if (!pilot) {
      this.legalNameEdit = '';
      return;
    }
    let legal = pilot.legalName != null ? String(pilot.legalName) : '';
    this.legalNameEdit = legal;
  }

  $onInit() {
    this.Auth.getCurrentUser(user => {
      if (user && user.email) {
        this.canEditLegalName = APPROVAL_EMAILS.indexOf(String(user.email).toLowerCase()) > -1;
      }
    });
    this.RotPilotContext.loadPilots().then(() => {
      this.pilots = this.RotPilotContext.getPilots();
      this.syncLegalNameFromPilot(this.pilotFromList(this.RotPilotContext.getChosenPilot()));
      this.scope.$watch(
        () => this.RotPilotContext.getChosenPilot(),
        (newVal) => {
          if (!newVal) return;
          this.syncLegalNameFromPilot(this.pilotFromList(newVal));
        },
        true
      );
    });
  }

  onSelect(pilot) {
    this.RotPilotContext.setChosenPilot(pilot);
    this.syncLegalNameFromPilot(pilot);
  }

  saveLegalName() {
    if (!this.canEditLegalName) return;
    if (!this.pilot || this.pilot._id == null) return;
    let legalName = this.legalNameEdit != null ? String(this.legalNameEdit).trim() : '';
    let doc = {_id: this.pilot._id, legalName: legalName};
    return this.http.post('/api/rot/updateFirebase', {collection: 'pilots', doc: doc}).then(() => {
      this.pilot.legalName = legalName;
      let idx = this.pilots.map(e => e._id).indexOf(this.pilot._id);
      if (idx > -1) this.pilots[idx].legalName = legalName;
      this.RotPilotContext.setChosenPilot(this.pilot);
    });
  }
}

RotPilotSelectorComponent.$inject = ['RotPilotContext', '$http', 'Auth', '$scope'];

angular.module('workspaceApp')
  .component('rotPilotSelector', {
    templateUrl: 'app/rot/rotPilotSelector/rotPilotSelector.html',
    controller: RotPilotSelectorComponent,
    controllerAs: 'rotPilotSelector'
  });

})();
