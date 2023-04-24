'use strict';

describe('Service: metar', function () {

  // load the service's module
  beforeEach(module('workspaceApp'));

  // instantiate service
  var metar;
  beforeEach(inject(function (_metar_) {
    metar = _metar_;
  }));

  it('should do something', function () {
    expect(!!metar).to.be.true;
  });

});
