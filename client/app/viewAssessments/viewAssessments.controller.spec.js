'use strict';

describe('Component: ViewAssessmentsComponent', function () {

  // load the controller's module
  beforeEach(module('workspaceApp'));

  var ViewAssessmentsComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    ViewAssessmentsComponent = $componentController('viewAssessments', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
