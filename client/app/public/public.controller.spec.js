'use strict';

describe('Component: PublicComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var PublicComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    PublicComponent = $componentController('public', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
