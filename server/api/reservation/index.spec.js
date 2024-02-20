'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var reservationCtrlStub = {
  index: 'reservationCtrl.index',
  show: 'reservationCtrl.show',
  create: 'reservationCtrl.create',
  update: 'reservationCtrl.update',
  destroy: 'reservationCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var reservationIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './reservation.controller': reservationCtrlStub
});

describe('Reservation API Router:', function() {

  it('should return an express router instance', function() {
    expect(reservationIndex).to.equal(routerStub);
  });

  describe('GET /api/reservations', function() {

    it('should route to reservation.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'reservationCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/reservations/:id', function() {

    it('should route to reservation.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'reservationCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/reservations', function() {

    it('should route to reservation.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'reservationCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/reservations/:id', function() {

    it('should route to reservation.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'reservationCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/reservations/:id', function() {

    it('should route to reservation.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'reservationCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/reservations/:id', function() {

    it('should route to reservation.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'reservationCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
