'use strict';

var app = require('../..');
import request from 'supertest';

var newMonitor;

describe('Monitor API:', function() {

  describe('GET /api/monitors', function() {
    var monitors;

    beforeEach(function(done) {
      request(app)
        .get('/api/monitors')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          monitors = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(monitors).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/monitors', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/monitors')
        .send({
          name: 'New Monitor',
          info: 'This is the brand new monitor!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newMonitor = res.body;
          done();
        });
    });

    it('should respond with the newly created monitor', function() {
      expect(newMonitor.name).to.equal('New Monitor');
      expect(newMonitor.info).to.equal('This is the brand new monitor!!!');
    });

  });

  describe('GET /api/monitors/:id', function() {
    var monitor;

    beforeEach(function(done) {
      request(app)
        .get('/api/monitors/' + newMonitor._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          monitor = res.body;
          done();
        });
    });

    afterEach(function() {
      monitor = {};
    });

    it('should respond with the requested monitor', function() {
      expect(monitor.name).to.equal('New Monitor');
      expect(monitor.info).to.equal('This is the brand new monitor!!!');
    });

  });

  describe('PUT /api/monitors/:id', function() {
    var updatedMonitor;

    beforeEach(function(done) {
      request(app)
        .put('/api/monitors/' + newMonitor._id)
        .send({
          name: 'Updated Monitor',
          info: 'This is the updated monitor!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedMonitor = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedMonitor = {};
    });

    it('should respond with the updated monitor', function() {
      expect(updatedMonitor.name).to.equal('Updated Monitor');
      expect(updatedMonitor.info).to.equal('This is the updated monitor!!!');
    });

  });

  describe('DELETE /api/monitors/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/monitors/' + newMonitor._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when monitor does not exist', function(done) {
      request(app)
        .delete('/api/monitors/' + newMonitor._id)
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
