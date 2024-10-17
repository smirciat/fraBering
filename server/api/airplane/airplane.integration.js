'use strict';

var app = require('../..');
import request from 'supertest';

var newAirplane;

describe('Airplane API:', function() {

  describe('GET /api/airplanes', function() {
    var airplanes;

    beforeEach(function(done) {
      request(app)
        .get('/api/airplanes')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          airplanes = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(airplanes).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/airplanes', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/airplanes')
        .send({
          name: 'New Airplane',
          info: 'This is the brand new airplane!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newAirplane = res.body;
          done();
        });
    });

    it('should respond with the newly created airplane', function() {
      expect(newAirplane.name).to.equal('New Airplane');
      expect(newAirplane.info).to.equal('This is the brand new airplane!!!');
    });

  });

  describe('GET /api/airplanes/:id', function() {
    var airplane;

    beforeEach(function(done) {
      request(app)
        .get('/api/airplanes/' + newAirplane._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          airplane = res.body;
          done();
        });
    });

    afterEach(function() {
      airplane = {};
    });

    it('should respond with the requested airplane', function() {
      expect(airplane.name).to.equal('New Airplane');
      expect(airplane.info).to.equal('This is the brand new airplane!!!');
    });

  });

  describe('PUT /api/airplanes/:id', function() {
    var updatedAirplane;

    beforeEach(function(done) {
      request(app)
        .put('/api/airplanes/' + newAirplane._id)
        .send({
          name: 'Updated Airplane',
          info: 'This is the updated airplane!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedAirplane = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedAirplane = {};
    });

    it('should respond with the updated airplane', function() {
      expect(updatedAirplane.name).to.equal('Updated Airplane');
      expect(updatedAirplane.info).to.equal('This is the updated airplane!!!');
    });

  });

  describe('DELETE /api/airplanes/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/airplanes/' + newAirplane._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when airplane does not exist', function(done) {
      request(app)
        .delete('/api/airplanes/' + newAirplane._id)
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
