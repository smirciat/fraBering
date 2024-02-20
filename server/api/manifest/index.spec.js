'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var manifestCtrlStub = {
  index: 'manifestCtrl.index',
  show: 'manifestCtrl.show',
  create: 'manifestCtrl.create',
  update: 'manifestCtrl.update',
  destroy: 'manifestCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var manifestIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './manifest.controller': manifestCtrlStub
});

describe('Manifest API Router:', function() {

  it('should return an express router instance', function() {
    expect(manifestIndex).to.equal(routerStub);
  });

  describe('GET /api/manifests', function() {

    it('should route to manifest.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'manifestCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/manifests/:id', function() {

    it('should route to manifest.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'manifestCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/manifests', function() {

    it('should route to manifest.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'manifestCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/manifests/:id', function() {

    it('should route to manifest.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'manifestCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/manifests/:id', function() {

    it('should route to manifest.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'manifestCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/manifests/:id', function() {

    it('should route to manifest.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'manifestCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
