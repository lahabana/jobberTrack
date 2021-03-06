/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var assert = require("assert");
var Resource = require("../lib/resource");
var Tracker = require("../lib/tracker");
var redis = require("redis");

var testKey = "testHash";

describe("Checking Tracker loading script", function() {
  var client = redis.createClient("","","");

  it('when loading the scripts', function(done) {
    client.script('flush', function() {
      var t = new Tracker(client, testKey);
      t.loadScripts(function(err, tracker) {
        var hash = tracker._hashes;
        assert.strictEqual(tracker, t);
        assert.ok(hash.create);
        assert.ok(hash.start);
        assert.ok(hash.get);
        assert.ok(hash.changeState);
        client.script('exists', hash.create, hash.start,
                                hash.get, hash.changeState, function(err, reply) {
          assert.deepEqual(reply, [1,1,1,1]);
          done();
        });
      });
    });
  });
});

describe("Checking Tracker methods", function() {
  var client = redis.createClient("","","");
  var tracker;
  // Create an operational tracker for each test
  beforeEach(function(done) {
    client.script('flush', function() {
      tracker = new Tracker(client, testKey);
      tracker.loadScripts(function(err, tracker) {
        done();
      });
    });
  });
  // Cleans the redis store after each test
  afterEach(function(done) {
    client.keys(testKey + ":*", function(err, reply) {
      if (reply.length > 0) {
        client.del(reply, function(err, reply) {
          done();
        });
      } else {
        done();
      }
    });
  });

  it('should create and push the right data', function(done) {
    tracker.createAndPush({"foo": "bar"}, function(err, id) {
      assert.strictEqual(typeof(id), "number");
      client.mget(testKey + ":nb", testKey + ":" + id + ":data", testKey + ":" + id + ":state",
                  function(err, reply){
        assert.strictEqual(reply[0], "1");
        assert.strictEqual(reply[1], JSON.stringify({"foo": "bar"}));
        assert.strictEqual(reply[2], "waiting");
        client.lpop(testKey + ":queue", function(err, reply) {
          assert.equal(reply, id);
          done();
        });
      });
    });
  });

  it('should push correctly in the queue multiple jobs', function(done) {
    tracker.createAndPush({"foo": "bar"}, function(err, id) {
      tracker.createAndPush({"foo": "bar2"}, function(err, id2) {
        client.get(testKey + ":nb", function(err, reply){
          assert.strictEqual(reply, "2");
          client.llen(testKey + ":queue", function(err, reply) {
            assert.equal(reply, 2);
            client.rpop(testKey + ":queue", function(err, reply) {
              assert.equal(reply, 1);
              client.rpop(testKey + ":queue", function(err, reply) {
                assert.equal(reply, 2);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should get a created element', function(done) {
    tracker.createAndPush({"foo": "bar"}, function(err, id) {
      tracker.get(id, function(err, resource) {
        assert.ok(resource instanceof Resource);
        assert.deepEqual(resource.data, {"foo": "bar"});
        assert.strictEqual(resource.state, "waiting");
        assert.deepEqual(resource.result, {});
        assert.strictEqual(resource.id, id);
        done();
      });
    });
  });

  it('should return null when the element doesn\'t exist', function(done) {
    tracker.get(99999, function(err, resource) {
      assert.strictEqual(resource, null);
      done();
    });
  });

  it('should change the state to the value we want', function(done) {
    client.set(testKey + ":1:state", "running", function(err, reply) {
      client.set(testKey + ":1:data", JSON.stringify({"foo": "bar"}), function(err, reply) {
        var res = new Resource({id: 1, data: {"foo": "bar"},
                                            result: {bim: "bam"},
                                            state: "finished"});
        tracker._changeState(res, function(err, resource) {
          assert.strictEqual(res, resource);
          client.mget(testKey + ":1:state", testKey + ":1:result", testKey + ":1:data",
              function(err, reply) {
            assert.strictEqual(reply[0], resource.state);
            assert.strictEqual(reply[1], JSON.stringify(resource.result));
            assert.strictEqual(reply[2], JSON.stringify(resource.data));
            done();
          });
        });
      });
    });
  });

  it('should pop the first element in the queue and start it', function(done) {
    client.set(testKey + ":1:state", "waiting", function(err, reply) {
      client.set(testKey + ":1:data", JSON.stringify({"foo": "bar"}), function(err, reply) {
        client.lpush(testKey + ":queue", 1, function(err, reply) {
          tracker.popAndStart(function(err, resource) {
            assert.ok(resource instanceof Resource);
            client.llen(testKey + ":queue", function(err, reply) {
              assert.equal(reply, 0);
              client.get(testKey + ":1:state", function(err, reply) {
                assert.strictEqual(reply, "running");
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should pop the first element in the queue finish it and call the callback', function(done) {
    client.set(testKey + ":1:state", "waiting", function(err, reply) {
      client.set(testKey + ":1:data", JSON.stringify({"foo": "bar"}), function(err, reply) {
        client.lpush(testKey + ":queue", 1, function(err, reply) {
          tracker.popAndStart(function(err, resource) {
            resource.finish({"foo": "bar"}, function(err, res) {
              assert.strictEqual(resource, res);
              client.mget(testKey + ":1:state", testKey + ":1:result", function(err, reply) {
                assert.strictEqual(reply[0], "finished");
                assert.strictEqual(reply[1], JSON.stringify({"foo": "bar"}));
                done();
              })
            });
          });
        });
      });
    });
  });

  it('should pop the first element in the queue fail it and call the callback', function(done) {
    client.set(testKey + ":1:state", "waiting", function(err, reply) {
      client.set(testKey + ":1:data", JSON.stringify({"foo": "bar"}), function(err, reply) {
        client.lpush(testKey + ":queue", 1, function(err, reply) {
          tracker.popAndStart(function(err, resource) {
            resource.fail({"foo": "bar"}, function(err, res) {
              assert.strictEqual(resource, res);
              client.mget(testKey + ":1:state", testKey + ":1:result", function(err, reply) {
                assert.strictEqual(reply[0], "failed");
                assert.strictEqual(reply[1], JSON.stringify({"foo": "bar"}));
                done();
              })
            });
          });
        });
      });
    });
  });
});
