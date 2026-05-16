'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var futureCharterCtrlStub = {
  index: 'futureCharterCtrl.index',
  show: 'futureCharterCtrl.show',
  create: 'futureCharterCtrl.create',
  update: 'futureCharterCtrl.update',
  destroy: 'futureCharterCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var futureCharterIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './futureCharter.controller': futureCharterCtrlStub
});

describe('FutureCharter API Router:', function() {

  it('should return an express router instance', function() {
    expect(futureCharterIndex).to.equal(routerStub);
  });

  describe('GET /api/futureCharters', function() {

    it('should route to futureCharter.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'futureCharterCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/futureCharters/:id', function() {

    it('should route to futureCharter.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'futureCharterCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/futureCharters', function() {

    it('should route to futureCharter.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'futureCharterCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/futureCharters/:id', function() {

    it('should route to futureCharter.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'futureCharterCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/futureCharters/:id', function() {

    it('should route to futureCharter.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'futureCharterCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/futureCharters/:id', function() {

    it('should route to futureCharter.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'futureCharterCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
