'use strict';

var app = require('../..');
import request from 'supertest';

var newTodaysFlight;

describe('TodaysFlight API:', function() {

  describe('GET /api/todaysFlights', function() {
    var todaysFlights;

    beforeEach(function(done) {
      request(app)
        .get('/api/todaysFlights')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          todaysFlights = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(todaysFlights).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/todaysFlights', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/todaysFlights')
        .send({
          name: 'New TodaysFlight',
          info: 'This is the brand new todaysFlight!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newTodaysFlight = res.body;
          done();
        });
    });

    it('should respond with the newly created todaysFlight', function() {
      expect(newTodaysFlight.name).to.equal('New TodaysFlight');
      expect(newTodaysFlight.info).to.equal('This is the brand new todaysFlight!!!');
    });

  });

  describe('GET /api/todaysFlights/:id', function() {
    var todaysFlight;

    beforeEach(function(done) {
      request(app)
        .get('/api/todaysFlights/' + newTodaysFlight._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          todaysFlight = res.body;
          done();
        });
    });

    afterEach(function() {
      todaysFlight = {};
    });

    it('should respond with the requested todaysFlight', function() {
      expect(todaysFlight.name).to.equal('New TodaysFlight');
      expect(todaysFlight.info).to.equal('This is the brand new todaysFlight!!!');
    });

  });

  describe('PUT /api/todaysFlights/:id', function() {
    var updatedTodaysFlight;

    beforeEach(function(done) {
      request(app)
        .put('/api/todaysFlights/' + newTodaysFlight._id)
        .send({
          name: 'Updated TodaysFlight',
          info: 'This is the updated todaysFlight!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedTodaysFlight = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedTodaysFlight = {};
    });

    it('should respond with the updated todaysFlight', function() {
      expect(updatedTodaysFlight.name).to.equal('Updated TodaysFlight');
      expect(updatedTodaysFlight.info).to.equal('This is the updated todaysFlight!!!');
    });

  });

  describe('DELETE /api/todaysFlights/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/todaysFlights/' + newTodaysFlight._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when todaysFlight does not exist', function(done) {
      request(app)
        .delete('/api/todaysFlights/' + newTodaysFlight._id)
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
