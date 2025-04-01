'use strict';

describe('Component: RosterComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var RosterComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    RosterComponent = $componentController('roster', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
