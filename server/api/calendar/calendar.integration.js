'use strict';

var app = require('../..');
import request from 'supertest';

var newCalendar;

describe('Calendar API:', function() {

  describe('GET /api/canledar', function() {
    var calendars;

    beforeEach(function(done) {
      request(app)
        .get('/api/canledar')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          calendars = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(calendars).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/canledar', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/canledar')
        .send({
          name: 'New Calendar',
          info: 'This is the brand new calendar!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newCalendar = res.body;
          done();
        });
    });

    it('should respond with the newly created calendar', function() {
      expect(newCalendar.name).to.equal('New Calendar');
      expect(newCalendar.info).to.equal('This is the brand new calendar!!!');
    });

  });

  describe('GET /api/canledar/:id', function() {
    var calendar;

    beforeEach(function(done) {
      request(app)
        .get('/api/canledar/' + newCalendar._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          calendar = res.body;
          done();
        });
    });

    afterEach(function() {
      calendar = {};
    });

    it('should respond with the requested calendar', function() {
      expect(calendar.name).to.equal('New Calendar');
      expect(calendar.info).to.equal('This is the brand new calendar!!!');
    });

  });

  describe('PUT /api/canledar/:id', function() {
    var updatedCalendar;

    beforeEach(function(done) {
      request(app)
        .put('/api/canledar/' + newCalendar._id)
        .send({
          name: 'Updated Calendar',
          info: 'This is the updated calendar!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedCalendar = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedCalendar = {};
    });

    it('should respond with the updated calendar', function() {
      expect(updatedCalendar.name).to.equal('Updated Calendar');
      expect(updatedCalendar.info).to.equal('This is the updated calendar!!!');
    });

  });

  describe('DELETE /api/canledar/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/canledar/' + newCalendar._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when calendar does not exist', function(done) {
      request(app)
        .delete('/api/canledar/' + newCalendar._id)
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
