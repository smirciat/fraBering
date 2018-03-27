'use strict';

describe('Component: TimeclockComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var TimeclockComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    TimeclockComponent = $componentController('timeclock', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
