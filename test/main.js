/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var assert = require('assert');
var redis = require('redis');
var JobberTrack = require('../index');
var Tracker = require('../lib/tracker');

describe("Checking Create", function() {
  var client = redis.createClient("","","");
  it('should load the scripts and create a ready client', function(done) {
    client.script('flush', function() {
      JobberTrack(client, "foo", function(err, tracker) {
        var hash = tracker._hashes;
        assert.ok(tracker instanceof Tracker);
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
