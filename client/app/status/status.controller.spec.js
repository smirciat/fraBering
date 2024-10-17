'use strict';

describe('Component: StatusComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var StatusComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    StatusComponent = $componentController('status', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
