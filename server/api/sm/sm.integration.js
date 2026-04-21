'use strict';

var app = require('../..');
import request from 'supertest';

var newSm;

describe('Sm API:', function() {

  describe('GET /api/sms', function() {
    var sms;

    beforeEach(function(done) {
      request(app)
        .get('/api/sms')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          sms = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(sms).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/sms', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/sms')
        .send({
          name: 'New Sm',
          info: 'This is the brand new sm!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newSm = res.body;
          done();
        });
    });

    it('should respond with the newly created sm', function() {
      expect(newSm.name).to.equal('New Sm');
      expect(newSm.info).to.equal('This is the brand new sm!!!');
    });

  });

  describe('GET /api/sms/:id', function() {
    var sm;

    beforeEach(function(done) {
      request(app)
        .get('/api/sms/' + newSm._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          sm = res.body;
          done();
        });
    });

    afterEach(function() {
      sm = {};
    });

    it('should respond with the requested sm', function() {
      expect(sm.name).to.equal('New Sm');
      expect(sm.info).to.equal('This is the brand new sm!!!');
    });

  });

  describe('PUT /api/sms/:id', function() {
    var updatedSm;

    beforeEach(function(done) {
      request(app)
        .put('/api/sms/' + newSm._id)
        .send({
          name: 'Updated Sm',
          info: 'This is the updated sm!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedSm = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedSm = {};
    });

    it('should respond with the updated sm', function() {
      expect(updatedSm.name).to.equal('Updated Sm');
      expect(updatedSm.info).to.equal('This is the updated sm!!!');
    });

  });

  describe('DELETE /api/sms/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/sms/' + newSm._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when sm does not exist', function(done) {
      request(app)
        .delete('/api/sms/' + newSm._id)
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
