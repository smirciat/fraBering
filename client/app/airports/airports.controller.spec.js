'use strict';

describe('Component: AirportsComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var AirportsComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    AirportsComponent = $componentController('airports', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
