'use strict';

var app = require('../..');
import request from 'supertest';

var newFutureCharter;

describe('FutureCharter API:', function() {

  describe('GET /api/futureCharters', function() {
    var futureCharters;

    beforeEach(function(done) {
      request(app)
        .get('/api/futureCharters')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          futureCharters = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(futureCharters).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/futureCharters', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/futureCharters')
        .send({
          name: 'New FutureCharter',
          info: 'This is the brand new futureCharter!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newFutureCharter = res.body;
          done();
        });
    });

    it('should respond with the newly created futureCharter', function() {
      expect(newFutureCharter.name).to.equal('New FutureCharter');
      expect(newFutureCharter.info).to.equal('This is the brand new futureCharter!!!');
    });

  });

  describe('GET /api/futureCharters/:id', function() {
    var futureCharter;

    beforeEach(function(done) {
      request(app)
        .get('/api/futureCharters/' + newFutureCharter._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          futureCharter = res.body;
          done();
        });
    });

    afterEach(function() {
      futureCharter = {};
    });

    it('should respond with the requested futureCharter', function() {
      expect(futureCharter.name).to.equal('New FutureCharter');
      expect(futureCharter.info).to.equal('This is the brand new futureCharter!!!');
    });

  });

  describe('PUT /api/futureCharters/:id', function() {
    var updatedFutureCharter;

    beforeEach(function(done) {
      request(app)
        .put('/api/futureCharters/' + newFutureCharter._id)
        .send({
          name: 'Updated FutureCharter',
          info: 'This is the updated futureCharter!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedFutureCharter = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedFutureCharter = {};
    });

    it('should respond with the updated futureCharter', function() {
      expect(updatedFutureCharter.name).to.equal('Updated FutureCharter');
      expect(updatedFutureCharter.info).to.equal('This is the updated futureCharter!!!');
    });

  });

  describe('DELETE /api/futureCharters/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/futureCharters/' + newFutureCharter._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when futureCharter does not exist', function(done) {
      request(app)
        .delete('/api/futureCharters/' + newFutureCharter._id)
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
