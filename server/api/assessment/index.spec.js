'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var assessmentCtrlStub = {
  index: 'assessmentCtrl.index',
  show: 'assessmentCtrl.show',
  create: 'assessmentCtrl.create',
  update: 'assessmentCtrl.update',
  destroy: 'assessmentCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var assessmentIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './assessment.controller': assessmentCtrlStub
});

describe('Assessment API Router:', function() {

  it('should return an express router instance', function() {
    expect(assessmentIndex).to.equal(routerStub);
  });

  describe('GET /api/assessments', function() {

    it('should route to assessment.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'assessmentCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/assessments/:id', function() {

    it('should route to assessment.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'assessmentCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/assessments', function() {

    it('should route to assessment.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'assessmentCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/assessments/:id', function() {

    it('should route to assessment.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'assessmentCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/assessments/:id', function() {

    it('should route to assessment.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'assessmentCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/assessments/:id', function() {

    it('should route to assessment.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'assessmentCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
