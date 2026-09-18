'use strict';

(function(){

class RotPilotSelectorComponent {
  constructor(RotPilotContext, $http, Auth, $scope, RotAccess) {
    this.RotPilotContext = RotPilotContext;
    this.http = $http;
    this.Auth = Auth;
    this.RotAccess = RotAccess;
    this.scope = $scope;
    this.pilots = [];
    this.pilot = null;
    this.legalNameEdit = '';
    this.canEditLegalName = false;
    this.canArchivePilot = false;
    this.showArchived = false;
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

  refreshPilotList() {
    this.pilots = this.RotPilotContext.getPilots();
    this.syncLegalNameFromPilot(this.pilotFromList(this.RotPilotContext.getChosenPilot()));
  }

  isArchived(pilot) {
    return this.RotPilotContext.isPilotArchived(pilot);
  }

  onShowArchivedChange() {
    this.RotPilotContext.setShowArchived(this.showArchived);
    this.refreshPilotList();
  }

  setArchived(archived) {
    if (!this.canArchivePilot || !this.pilot || this.pilot._id == null) return;
    const verb = archived ? 'archive' : 'restore';
    const label = this.pilot.name || this.pilot._id;
    if (!window.confirm((archived ? 'Archive' : 'Restore') + ' pilot ' + label + '?')) return;
    const doc = {
      _id: this.pilot._id,
      rotArchived: !!archived,
      isActive: !archived
    };
    return this.http.post('/api/rot/updateFirebase', {collection: 'pilots', doc: doc}).then(() => {
      this.RotPilotContext.mergePilotDoc(doc);
      this.refreshPilotList();
    });
  }

  $onInit() {
    this.Auth.getCurrentUser(user => {
      if (!user) return;
      this.canArchivePilot = this.RotAccess.canArchiveRotPilots(user);
      if (user.email) {
        this.canEditLegalName = this.canArchivePilot;
      }
    });
    this.showArchived = this.RotPilotContext.getShowArchived();
    this.RotPilotContext.loadPilots().then(() => {
      this.refreshPilotList();
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

RotPilotSelectorComponent.$inject = ['RotPilotContext', '$http', 'Auth', '$scope', 'RotAccess'];

angular.module('workspaceApp')
  .component('rotPilotSelector', {
    templateUrl: 'app/rot/rotPilotSelector/rotPilotSelector.html',
    controller: RotPilotSelectorComponent,
    controllerAs: 'rotPilotSelector'
  });

})();
