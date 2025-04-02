'use strict';

describe('Component: AuditComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var AuditComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    AuditComponent = $componentController('audit', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
