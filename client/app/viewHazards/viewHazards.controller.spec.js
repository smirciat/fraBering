'use strict';

describe('Component: ViewHazardsComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var ViewHazardsComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    ViewHazardsComponent = $componentController('viewHazards', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
