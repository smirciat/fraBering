'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var timesheetCtrlStub = {
  index: 'timesheetCtrl.index',
  show: 'timesheetCtrl.show',
  create: 'timesheetCtrl.create',
  update: 'timesheetCtrl.update',
  destroy: 'timesheetCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var timesheetIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './timesheet.controller': timesheetCtrlStub
});

describe('Timesheet API Router:', function() {

  it('should return an express router instance', function() {
    expect(timesheetIndex).to.equal(routerStub);
  });

  describe('GET /api/timesheets', function() {

    it('should route to timesheet.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'timesheetCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/timesheets/:id', function() {

    it('should route to timesheet.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'timesheetCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/timesheets', function() {

    it('should route to timesheet.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'timesheetCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/timesheets/:id', function() {

    it('should route to timesheet.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'timesheetCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/timesheets/:id', function() {

    it('should route to timesheet.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'timesheetCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/timesheets/:id', function() {

    it('should route to timesheet.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'timesheetCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
