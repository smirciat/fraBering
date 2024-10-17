'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var airplaneCtrlStub = {
  index: 'airplaneCtrl.index',
  show: 'airplaneCtrl.show',
  create: 'airplaneCtrl.create',
  update: 'airplaneCtrl.update',
  destroy: 'airplaneCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var airplaneIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './airplane.controller': airplaneCtrlStub
});

describe('Airplane API Router:', function() {

  it('should return an express router instance', function() {
    expect(airplaneIndex).to.equal(routerStub);
  });

  describe('GET /api/airplanes', function() {

    it('should route to airplane.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'airplaneCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/airplanes/:id', function() {

    it('should route to airplane.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'airplaneCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/airplanes', function() {

    it('should route to airplane.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'airplaneCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/airplanes/:id', function() {

    it('should route to airplane.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'airplaneCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/airplanes/:id', function() {

    it('should route to airplane.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'airplaneCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/airplanes/:id', function() {

    it('should route to airplane.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'airplaneCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
