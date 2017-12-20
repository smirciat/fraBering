'use strict';

var app = require('../..');
import request from 'supertest';

var newHazardReport;

describe('HazardReport API:', function() {

  describe('GET /api/hazardReports', function() {
    var hazardReports;

    beforeEach(function(done) {
      request(app)
        .get('/api/hazardReports')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          hazardReports = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(hazardReports).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/hazardReports', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/hazardReports')
        .send({
          name: 'New HazardReport',
          info: 'This is the brand new hazardReport!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newHazardReport = res.body;
          done();
        });
    });

    it('should respond with the newly created hazardReport', function() {
      expect(newHazardReport.name).to.equal('New HazardReport');
      expect(newHazardReport.info).to.equal('This is the brand new hazardReport!!!');
    });

  });

  describe('GET /api/hazardReports/:id', function() {
    var hazardReport;

    beforeEach(function(done) {
      request(app)
        .get('/api/hazardReports/' + newHazardReport._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          hazardReport = res.body;
          done();
        });
    });

    afterEach(function() {
      hazardReport = {};
    });

    it('should respond with the requested hazardReport', function() {
      expect(hazardReport.name).to.equal('New HazardReport');
      expect(hazardReport.info).to.equal('This is the brand new hazardReport!!!');
    });

  });

  describe('PUT /api/hazardReports/:id', function() {
    var updatedHazardReport;

    beforeEach(function(done) {
      request(app)
        .put('/api/hazardReports/' + newHazardReport._id)
        .send({
          name: 'Updated HazardReport',
          info: 'This is the updated hazardReport!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedHazardReport = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedHazardReport = {};
    });

    it('should respond with the updated hazardReport', function() {
      expect(updatedHazardReport.name).to.equal('Updated HazardReport');
      expect(updatedHazardReport.info).to.equal('This is the updated hazardReport!!!');
    });

  });

  describe('DELETE /api/hazardReports/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/hazardReports/' + newHazardReport._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when hazardReport does not exist', function(done) {
      request(app)
        .delete('/api/hazardReports/' + newHazardReport._id)
        .expect(404)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

  });

});
