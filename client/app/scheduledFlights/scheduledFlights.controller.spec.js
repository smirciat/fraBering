'use strict';

describe('Component: ScheduledFlightsComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var ScheduledFlightsComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    ScheduledFlightsComponent = $componentController('scheduledFlights', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
