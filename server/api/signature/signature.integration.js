'use strict';

var app = require('../..');
import request from 'supertest';

var newSignature;

describe('Signature API:', function() {

  describe('GET /api/signatures', function() {
    var signatures;

    beforeEach(function(done) {
      request(app)
        .get('/api/signatures')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          signatures = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(signatures).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/signatures', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/signatures')
        .send({
          name: 'New Signature',
          info: 'This is the brand new signature!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newSignature = res.body;
          done();
        });
    });

    it('should respond with the newly created signature', function() {
      expect(newSignature.name).to.equal('New Signature');
      expect(newSignature.info).to.equal('This is the brand new signature!!!');
    });

  });

  describe('GET /api/signatures/:id', function() {
    var signature;

    beforeEach(function(done) {
      request(app)
        .get('/api/signatures/' + newSignature._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          signature = res.body;
          done();
        });
    });

    afterEach(function() {
      signature = {};
    });

    it('should respond with the requested signature', function() {
      expect(signature.name).to.equal('New Signature');
      expect(signature.info).to.equal('This is the brand new signature!!!');
    });

  });

  describe('PUT /api/signatures/:id', function() {
    var updatedSignature;

    beforeEach(function(done) {
      request(app)
        .put('/api/signatures/' + newSignature._id)
        .send({
          name: 'Updated Signature',
          info: 'This is the updated signature!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedSignature = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedSignature = {};
    });

    it('should respond with the updated signature', function() {
      expect(updatedSignature.name).to.equal('Updated Signature');
      expect(updatedSignature.info).to.equal('This is the updated signature!!!');
    });

  });

  describe('DELETE /api/signatures/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/signatures/' + newSignature._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when signature does not exist', function(done) {
      request(app)
        .delete('/api/signatures/' + newSignature._id)
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
