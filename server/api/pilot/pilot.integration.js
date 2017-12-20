'use strict';

var app = require('../..');
import request from 'supertest';

var newPilot;

describe('Pilot API:', function() {

  describe('GET /api/pilots', function() {
    var pilots;

    beforeEach(function(done) {
      request(app)
        .get('/api/pilots')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          pilots = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(pilots).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/pilots', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/pilots')
        .send({
          name: 'New Pilot',
          info: 'This is the brand new pilot!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newPilot = res.body;
          done();
        });
    });

    it('should respond with the newly created pilot', function() {
      expect(newPilot.name).to.equal('New Pilot');
      expect(newPilot.info).to.equal('This is the brand new pilot!!!');
    });

  });

  describe('GET /api/pilots/:id', function() {
    var pilot;

    beforeEach(function(done) {
      request(app)
        .get('/api/pilots/' + newPilot._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          pilot = res.body;
          done();
        });
    });

    afterEach(function() {
      pilot = {};
    });

    it('should respond with the requested pilot', function() {
      expect(pilot.name).to.equal('New Pilot');
      expect(pilot.info).to.equal('This is the brand new pilot!!!');
    });

  });

  describe('PUT /api/pilots/:id', function() {
    var updatedPilot;

    beforeEach(function(done) {
      request(app)
        .put('/api/pilots/' + newPilot._id)
        .send({
          name: 'Updated Pilot',
          info: 'This is the updated pilot!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedPilot = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedPilot = {};
    });

    it('should respond with the updated pilot', function() {
      expect(updatedPilot.name).to.equal('Updated Pilot');
      expect(updatedPilot.info).to.equal('This is the updated pilot!!!');
    });

  });

  describe('DELETE /api/pilots/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/pilots/' + newPilot._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when pilot does not exist', function(done) {
      request(app)
        .delete('/api/pilots/' + newPilot._id)
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
