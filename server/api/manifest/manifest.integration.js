'use strict';

var app = require('../..');
import request from 'supertest';

var newManifest;

describe('Manifest API:', function() {

  describe('GET /api/manifests', function() {
    var manifests;

    beforeEach(function(done) {
      request(app)
        .get('/api/manifests')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          manifests = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(manifests).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/manifests', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/manifests')
        .send({
          name: 'New Manifest',
          info: 'This is the brand new manifest!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newManifest = res.body;
          done();
        });
    });

    it('should respond with the newly created manifest', function() {
      expect(newManifest.name).to.equal('New Manifest');
      expect(newManifest.info).to.equal('This is the brand new manifest!!!');
    });

  });

  describe('GET /api/manifests/:id', function() {
    var manifest;

    beforeEach(function(done) {
      request(app)
        .get('/api/manifests/' + newManifest._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          manifest = res.body;
          done();
        });
    });

    afterEach(function() {
      manifest = {};
    });

    it('should respond with the requested manifest', function() {
      expect(manifest.name).to.equal('New Manifest');
      expect(manifest.info).to.equal('This is the brand new manifest!!!');
    });

  });

  describe('PUT /api/manifests/:id', function() {
    var updatedManifest;

    beforeEach(function(done) {
      request(app)
        .put('/api/manifests/' + newManifest._id)
        .send({
          name: 'Updated Manifest',
          info: 'This is the updated manifest!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedManifest = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedManifest = {};
    });

    it('should respond with the updated manifest', function() {
      expect(updatedManifest.name).to.equal('Updated Manifest');
      expect(updatedManifest.info).to.equal('This is the updated manifest!!!');
    });

  });

  describe('DELETE /api/manifests/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/manifests/' + newManifest._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when manifest does not exist', function(done) {
      request(app)
        .delete('/api/manifests/' + newManifest._id)
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
