'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var snapshotCtrlStub = {
  index: 'snapshotCtrl.index',
  show: 'snapshotCtrl.show',
  create: 'snapshotCtrl.create',
  update: 'snapshotCtrl.update',
  destroy: 'snapshotCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var snapshotIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './snapshot.controller': snapshotCtrlStub
});

describe('Snapshot API Router:', function() {

  it('should return an express router instance', function() {
    expect(snapshotIndex).to.equal(routerStub);
  });

  describe('GET /api/snapshots', function() {

    it('should route to snapshot.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'snapshotCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/snapshots/:id', function() {

    it('should route to snapshot.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'snapshotCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/snapshots', function() {

    it('should route to snapshot.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'snapshotCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/snapshots/:id', function() {

    it('should route to snapshot.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'snapshotCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/snapshots/:id', function() {

    it('should route to snapshot.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'snapshotCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/snapshots/:id', function() {

    it('should route to snapshot.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'snapshotCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
