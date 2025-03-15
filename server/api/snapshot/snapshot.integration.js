'use strict';

var app = require('../..');
import request from 'supertest';

var newSnapshot;

describe('Snapshot API:', function() {

  describe('GET /api/snapshots', function() {
    var snapshots;

    beforeEach(function(done) {
      request(app)
        .get('/api/snapshots')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          snapshots = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(snapshots).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/snapshots', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/snapshots')
        .send({
          name: 'New Snapshot',
          info: 'This is the brand new snapshot!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newSnapshot = res.body;
          done();
        });
    });

    it('should respond with the newly created snapshot', function() {
      expect(newSnapshot.name).to.equal('New Snapshot');
      expect(newSnapshot.info).to.equal('This is the brand new snapshot!!!');
    });

  });

  describe('GET /api/snapshots/:id', function() {
    var snapshot;

    beforeEach(function(done) {
      request(app)
        .get('/api/snapshots/' + newSnapshot._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          snapshot = res.body;
          done();
        });
    });

    afterEach(function() {
      snapshot = {};
    });

    it('should respond with the requested snapshot', function() {
      expect(snapshot.name).to.equal('New Snapshot');
      expect(snapshot.info).to.equal('This is the brand new snapshot!!!');
    });

  });

  describe('PUT /api/snapshots/:id', function() {
    var updatedSnapshot;

    beforeEach(function(done) {
      request(app)
        .put('/api/snapshots/' + newSnapshot._id)
        .send({
          name: 'Updated Snapshot',
          info: 'This is the updated snapshot!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedSnapshot = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedSnapshot = {};
    });

    it('should respond with the updated snapshot', function() {
      expect(updatedSnapshot.name).to.equal('Updated Snapshot');
      expect(updatedSnapshot.info).to.equal('This is the updated snapshot!!!');
    });

  });

  describe('DELETE /api/snapshots/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/snapshots/' + newSnapshot._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when snapshot does not exist', function(done) {
      request(app)
        .delete('/api/snapshots/' + newSnapshot._id)
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
