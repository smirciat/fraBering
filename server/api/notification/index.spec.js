'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var notificationCtrlStub = {
  index: 'notificationCtrl.index',
  show: 'notificationCtrl.show',
  create: 'notificationCtrl.create',
  update: 'notificationCtrl.update',
  destroy: 'notificationCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var notificationIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './notification.controller': notificationCtrlStub
});

describe('Notification API Router:', function() {

  it('should return an express router instance', function() {
    expect(notificationIndex).to.equal(routerStub);
  });

  describe('GET /api/notifications', function() {

    it('should route to notification.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'notificationCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/notifications/:id', function() {

    it('should route to notification.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'notificationCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/notifications', function() {

    it('should route to notification.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'notificationCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/notifications/:id', function() {

    it('should route to notification.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'notificationCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/notifications/:id', function() {

    it('should route to notification.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'notificationCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/notifications/:id', function() {

    it('should route to notification.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'notificationCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
