'use strict';

var app = require('../..');
import request from 'supertest';

var newReservation;

describe('Reservation API:', function() {

  describe('GET /api/reservations', function() {
    var reservations;

    beforeEach(function(done) {
      request(app)
        .get('/api/reservations')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          reservations = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(reservations).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/reservations', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/reservations')
        .send({
          name: 'New Reservation',
          info: 'This is the brand new reservation!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newReservation = res.body;
          done();
        });
    });

    it('should respond with the newly created reservation', function() {
      expect(newReservation.name).to.equal('New Reservation');
      expect(newReservation.info).to.equal('This is the brand new reservation!!!');
    });

  });

  describe('GET /api/reservations/:id', function() {
    var reservation;

    beforeEach(function(done) {
      request(app)
        .get('/api/reservations/' + newReservation._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          reservation = res.body;
          done();
        });
    });

    afterEach(function() {
      reservation = {};
    });

    it('should respond with the requested reservation', function() {
      expect(reservation.name).to.equal('New Reservation');
      expect(reservation.info).to.equal('This is the brand new reservation!!!');
    });

  });

  describe('PUT /api/reservations/:id', function() {
    var updatedReservation;

    beforeEach(function(done) {
      request(app)
        .put('/api/reservations/' + newReservation._id)
        .send({
          name: 'Updated Reservation',
          info: 'This is the updated reservation!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedReservation = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedReservation = {};
    });

    it('should respond with the updated reservation', function() {
      expect(updatedReservation.name).to.equal('Updated Reservation');
      expect(updatedReservation.info).to.equal('This is the updated reservation!!!');
    });

  });

  describe('DELETE /api/reservations/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/reservations/' + newReservation._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when reservation does not exist', function(done) {
      request(app)
        .delete('/api/reservations/' + newReservation._id)
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
