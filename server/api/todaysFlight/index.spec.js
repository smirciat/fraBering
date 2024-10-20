'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var todaysFlightCtrlStub = {
  index: 'todaysFlightCtrl.index',
  show: 'todaysFlightCtrl.show',
  create: 'todaysFlightCtrl.create',
  update: 'todaysFlightCtrl.update',
  destroy: 'todaysFlightCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var todaysFlightIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './todaysFlight.controller': todaysFlightCtrlStub
});

describe('TodaysFlight API Router:', function() {

  it('should return an express router instance', function() {
    expect(todaysFlightIndex).to.equal(routerStub);
  });

  describe('GET /api/todaysFlights', function() {

    it('should route to todaysFlight.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'todaysFlightCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/todaysFlights/:id', function() {

    it('should route to todaysFlight.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'todaysFlightCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/todaysFlights', function() {

    it('should route to todaysFlight.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'todaysFlightCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/todaysFlights/:id', function() {

    it('should route to todaysFlight.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'todaysFlightCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/todaysFlights/:id', function() {

    it('should route to todaysFlight.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'todaysFlightCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/todaysFlights/:id', function() {

    it('should route to todaysFlight.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'todaysFlightCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
