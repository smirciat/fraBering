'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var pilotCtrlStub = {
  index: 'pilotCtrl.index',
  show: 'pilotCtrl.show',
  create: 'pilotCtrl.create',
  update: 'pilotCtrl.update',
  destroy: 'pilotCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var pilotIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './pilot.controller': pilotCtrlStub
});

describe('Pilot API Router:', function() {

  it('should return an express router instance', function() {
    expect(pilotIndex).to.equal(routerStub);
  });

  describe('GET /api/pilots', function() {

    it('should route to pilot.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'pilotCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/pilots/:id', function() {

    it('should route to pilot.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'pilotCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/pilots', function() {

    it('should route to pilot.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'pilotCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/pilots/:id', function() {

    it('should route to pilot.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'pilotCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/pilots/:id', function() {

    it('should route to pilot.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'pilotCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/pilots/:id', function() {

    it('should route to pilot.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'pilotCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
