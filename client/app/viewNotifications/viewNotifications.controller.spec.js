'use strict';

describe('Component: ViewNotificationsComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var ViewNotificationsComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    ViewNotificationsComponent = $componentController('viewNotifications', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
