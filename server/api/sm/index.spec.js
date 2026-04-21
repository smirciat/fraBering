'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var smCtrlStub = {
  index: 'smCtrl.index',
  show: 'smCtrl.show',
  create: 'smCtrl.create',
  update: 'smCtrl.update',
  destroy: 'smCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var smIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './sm.controller': smCtrlStub
});

describe('Sm API Router:', function() {

  it('should return an express router instance', function() {
    expect(smIndex).to.equal(routerStub);
  });

  describe('GET /api/sms', function() {

    it('should route to sm.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'smCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/sms/:id', function() {

    it('should route to sm.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'smCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/sms', function() {

    it('should route to sm.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'smCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/sms/:id', function() {

    it('should route to sm.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'smCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/sms/:id', function() {

    it('should route to sm.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'smCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/sms/:id', function() {

    it('should route to sm.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'smCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
