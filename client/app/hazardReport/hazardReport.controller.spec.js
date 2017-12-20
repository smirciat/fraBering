'use strict';

describe('Component: HazardReportComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var HazardReportComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    HazardReportComponent = $componentController('hazardReport', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
