'use strict';

(function(){

class RotPilotSelectorComponent {
  constructor(RotPilotContext) {
    this.RotPilotContext = RotPilotContext;
    this.pilots = [];
    this.pilot = null;
  }

  $onInit() {
    this.RotPilotContext.loadPilots().then(() => {
      this.pilots = this.RotPilotContext.getPilots();
      this.pilot = this.RotPilotContext.getChosenPilot();
    });
  }

  onSelect(pilot) {
    this.RotPilotContext.setChosenPilot(pilot);
  }
}

angular.module('workspaceApp')
  .component('rotPilotSelector', {
    templateUrl: 'app/rot/rotPilotSelector/rotPilotSelector.html',
    controller: RotPilotSelectorComponent,
    controllerAs: 'rotPilotSelector'
  });

})();
