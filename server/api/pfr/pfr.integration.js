'use strict';

var app = require('../..');
import request from 'supertest';

var newPfr;

describe('Pfr API:', function() {

  describe('GET /api/pfrs', function() {
    var pfrs;

    beforeEach(function(done) {
      request(app)
        .get('/api/pfrs')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          pfrs = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(pfrs).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/pfrs', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/pfrs')
        .send({
          name: 'New Pfr',
          info: 'This is the brand new pfr!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newPfr = res.body;
          done();
        });
    });

    it('should respond with the newly created pfr', function() {
      expect(newPfr.name).to.equal('New Pfr');
      expect(newPfr.info).to.equal('This is the brand new pfr!!!');
    });

  });

  describe('GET /api/pfrs/:id', function() {
    var pfr;

    beforeEach(function(done) {
      request(app)
        .get('/api/pfrs/' + newPfr._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          pfr = res.body;
          done();
        });
    });

    afterEach(function() {
      pfr = {};
    });

    it('should respond with the requested pfr', function() {
      expect(pfr.name).to.equal('New Pfr');
      expect(pfr.info).to.equal('This is the brand new pfr!!!');
    });

  });

  describe('PUT /api/pfrs/:id', function() {
    var updatedPfr;

    beforeEach(function(done) {
      request(app)
        .put('/api/pfrs/' + newPfr._id)
        .send({
          name: 'Updated Pfr',
          info: 'This is the updated pfr!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedPfr = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedPfr = {};
    });

    it('should respond with the updated pfr', function() {
      expect(updatedPfr.name).to.equal('Updated Pfr');
      expect(updatedPfr.info).to.equal('This is the updated pfr!!!');
    });

  });

  describe('DELETE /api/pfrs/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/pfrs/' + newPfr._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when pfr does not exist', function(done) {
      request(app)
        .delete('/api/pfrs/' + newPfr._id)
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
