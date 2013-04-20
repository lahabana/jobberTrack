/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var assert = require('assert');
var JobberTrack = require('../index.js');
var redis = require("redis-mock");

describe('General implementation check', function() {
  it('the package has everything', function() {
    assert.strictEqual(typeof(JobberTrack.Handler), "function");
    assert.strictEqual(typeof(JobberTrack.Resource), "function");
  });
});

describe('Create', function() {
  var client = redis.createClient("","","");
  it('init', function() {
    var track = new JobberTrack.Handler(client);
    track.setDefaultTimeout(10);
    assert.strictEqual(track.timeout, 10);
  });

  it('create simple', function(done) {
    var track = new JobberTrack.Handler(client);
    track.create(12, function(err, elt) {
      assert.ok(!err, err);
      assert.ok(typeof(elt.id) === "number");
      assert.strictEqual(elt.state, "waiting");
      done();
    });
  });

  it('create without timeout', function(done) {
    var track = new JobberTrack.Handler(client);
    track.setDefaultTimeout(10);
    track.create(function(err, elt) {
      assert.ok(!err, err);
      assert.ok(typeof(elt.id) === "number");
      assert.strictEqual(elt.state, "waiting");
      done();
    });
  });

});

describe("Testing start,stop,fail and finish of a resource", function() {
  var client = redis.createClient("","","");
  it('start', function(done) {
    var track = new JobberTrack.Handler(client);
    track.create(12, function(err, elt) {
      elt.start(function(err, reply) {
        assert.ok(!err, err);
        assert.strictEqual(elt.state, "running");
        done();
      });
    });
  });

  it('start error', function(done) {
    var track = new JobberTrack.Handler(client);
    track.create(12, function(err, elt) {
      elt.start(function(err, reply) {
        elt.finish({}, function(err, reply) {
          elt.start(function (err, reply) {
            assert.ok(err, "an error should happen as we are stopped");
            assert.strictEqual(elt.state, "finished");
            done();
          });
        });

      });
    });
  });

  it('fail', function (done) {
    var track = new JobberTrack.Handler(client);
    track.create(12, function(err, elt) {
      elt.start(function(err, reply) {
        elt.fail(function(err, reply) {
          assert.ok(!err, err);
          assert.strictEqual(elt.state, "failed");
          done();
        });
      });
    });
  });

  it('fail error', function (done) {
    var track = new JobberTrack.Handler(client);
    track.create(12, function(err, elt) {
      elt.fail(function(err, reply) {
          assert.ok(err, "an error should happen as we haven't started");
          assert.strictEqual(elt.state, "waiting");
          done();
      });
    });
  });

  it('finish', function (done) {
    var track = new JobberTrack.Handler(client);
    track.create(12, function(err, elt) {
      elt.start(function(err, reply) {
        elt.finish("http://google.com", function(err, reply) {
            assert.ok(!err, err);
            assert.strictEqual(elt.state, "finished");
            assert.deepEqual(elt.data, "http://google.com");
            done();
        });
      });
    });
  });
});

describe("Testing get on a resource", function() {
  var client = redis.createClient("","","");
  it('simple', function(done) {
    var track = new JobberTrack.Handler(client);

    track.create(12, function(err, elt) {
      setTimeout(function() {
        track.get(elt.id, function(err, reply) {
            assert.ok(!err, err);
            assert.strictEqual(elt.state, "waiting");
            done();
        });
      }, 1);
    });
  });
});
