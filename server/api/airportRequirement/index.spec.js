'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var airportRequirementCtrlStub = {
  index: 'airportRequirementCtrl.index',
  show: 'airportRequirementCtrl.show',
  create: 'airportRequirementCtrl.create',
  update: 'airportRequirementCtrl.update',
  destroy: 'airportRequirementCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var airportRequirementIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './airportRequirement.controller': airportRequirementCtrlStub
});

describe('AirportRequirement API Router:', function() {

  it('should return an express router instance', function() {
    expect(airportRequirementIndex).to.equal(routerStub);
  });

  describe('GET /api/airportRequirements', function() {

    it('should route to airportRequirement.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'airportRequirementCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/airportRequirements/:id', function() {

    it('should route to airportRequirement.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'airportRequirementCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/airportRequirements', function() {

    it('should route to airportRequirement.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'airportRequirementCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/airportRequirements/:id', function() {

    it('should route to airportRequirement.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'airportRequirementCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/airportRequirements/:id', function() {

    it('should route to airportRequirement.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'airportRequirementCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/airportRequirements/:id', function() {

    it('should route to airportRequirement.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'airportRequirementCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
