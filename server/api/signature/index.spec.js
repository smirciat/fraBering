'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var signatureCtrlStub = {
  index: 'signatureCtrl.index',
  show: 'signatureCtrl.show',
  create: 'signatureCtrl.create',
  update: 'signatureCtrl.update',
  destroy: 'signatureCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var signatureIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './signature.controller': signatureCtrlStub
});

describe('Signature API Router:', function() {

  it('should return an express router instance', function() {
    expect(signatureIndex).to.equal(routerStub);
  });

  describe('GET /api/signatures', function() {

    it('should route to signature.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'signatureCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/signatures/:id', function() {

    it('should route to signature.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'signatureCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/signatures', function() {

    it('should route to signature.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'signatureCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/signatures/:id', function() {

    it('should route to signature.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'signatureCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/signatures/:id', function() {

    it('should route to signature.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'signatureCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/signatures/:id', function() {

    it('should route to signature.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'signatureCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
