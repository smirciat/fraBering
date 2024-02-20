'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var hazardReportCtrlStub = {
  index: 'hazardReportCtrl.index',
  show: 'hazardReportCtrl.show',
  create: 'hazardReportCtrl.create',
  update: 'hazardReportCtrl.update',
  destroy: 'hazardReportCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var hazardReportIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './hazardReport.controller': hazardReportCtrlStub
});

describe('HazardReport API Router:', function() {

  it('should return an express router instance', function() {
    expect(hazardReportIndex).to.equal(routerStub);
  });

  describe('GET /api/hazardReports', function() {

    it('should route to hazardReport.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'hazardReportCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/hazardReports/:id', function() {

    it('should route to hazardReport.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'hazardReportCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/hazardReports', function() {

    it('should route to hazardReport.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'hazardReportCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/hazardReports/:id', function() {

    it('should route to hazardReport.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'hazardReportCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/hazardReports/:id', function() {

    it('should route to hazardReport.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'hazardReportCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/hazardReports/:id', function() {

    it('should route to hazardReport.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'hazardReportCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
