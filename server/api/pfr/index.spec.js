'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var pfrCtrlStub = {
  index: 'pfrCtrl.index',
  show: 'pfrCtrl.show',
  create: 'pfrCtrl.create',
  update: 'pfrCtrl.update',
  destroy: 'pfrCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var pfrIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './pfr.controller': pfrCtrlStub
});

describe('Pfr API Router:', function() {

  it('should return an express router instance', function() {
    expect(pfrIndex).to.equal(routerStub);
  });

  describe('GET /api/pfrs', function() {

    it('should route to pfr.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'pfrCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/pfrs/:id', function() {

    it('should route to pfr.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'pfrCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/pfrs', function() {

    it('should route to pfr.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'pfrCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/pfrs/:id', function() {

    it('should route to pfr.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'pfrCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/pfrs/:id', function() {

    it('should route to pfr.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'pfrCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/pfrs/:id', function() {

    it('should route to pfr.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'pfrCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
