'use strict';

describe('Directive: loads', function () {

  // load the directive's module and view
  beforeEach(module('workspaceApp'));
  beforeEach(module('components/loads/loads.html'));

  var element, scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<loads></loads>');
    element = $compile(element)(scope);
    scope.$apply();
    expect(element.text()).to.equal('this is the loads directive');
  }));
});
