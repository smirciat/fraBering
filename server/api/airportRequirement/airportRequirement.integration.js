'use strict';

var app = require('../..');
import request from 'supertest';

var newAirportRequirement;

describe('AirportRequirement API:', function() {

  describe('GET /api/airportRequirements', function() {
    var airportRequirements;

    beforeEach(function(done) {
      request(app)
        .get('/api/airportRequirements')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          airportRequirements = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(airportRequirements).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/airportRequirements', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/airportRequirements')
        .send({
          name: 'New AirportRequirement',
          info: 'This is the brand new airportRequirement!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newAirportRequirement = res.body;
          done();
        });
    });

    it('should respond with the newly created airportRequirement', function() {
      expect(newAirportRequirement.name).to.equal('New AirportRequirement');
      expect(newAirportRequirement.info).to.equal('This is the brand new airportRequirement!!!');
    });

  });

  describe('GET /api/airportRequirements/:id', function() {
    var airportRequirement;

    beforeEach(function(done) {
      request(app)
        .get('/api/airportRequirements/' + newAirportRequirement._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          airportRequirement = res.body;
          done();
        });
    });

    afterEach(function() {
      airportRequirement = {};
    });

    it('should respond with the requested airportRequirement', function() {
      expect(airportRequirement.name).to.equal('New AirportRequirement');
      expect(airportRequirement.info).to.equal('This is the brand new airportRequirement!!!');
    });

  });

  describe('PUT /api/airportRequirements/:id', function() {
    var updatedAirportRequirement;

    beforeEach(function(done) {
      request(app)
        .put('/api/airportRequirements/' + newAirportRequirement._id)
        .send({
          name: 'Updated AirportRequirement',
          info: 'This is the updated airportRequirement!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedAirportRequirement = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedAirportRequirement = {};
    });

    it('should respond with the updated airportRequirement', function() {
      expect(updatedAirportRequirement.name).to.equal('Updated AirportRequirement');
      expect(updatedAirportRequirement.info).to.equal('This is the updated airportRequirement!!!');
    });

  });

  describe('DELETE /api/airportRequirements/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/airportRequirements/' + newAirportRequirement._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when airportRequirement does not exist', function(done) {
      request(app)
        .delete('/api/airportRequirements/' + newAirportRequirement._id)
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
