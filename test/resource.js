/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var assert = require("assert");
var Resource = require("../lib/resource");

describe('Checking Resource', function() {
  it('init empty', function() {
    var res = new Resource({});
    assert.deepEqual(res.data, {});
    assert.deepEqual(res.result, {});
    assert.strictEqual(res.state, "waiting");
    assert.strictEqual(res.id, undefined);
    assert.ok(res instanceof require('events').EventEmitter);
  });

  it('init nothing should throw', function() {
    try {
      var res = new Resource();
    } catch(e) {
      assert.ok(e instanceof Error);
    }
  });

  it('init without id', function() {
    var res = new Resource({data: {foo: "bar"}});
    assert.deepEqual(res.data, {foo: "bar"});
    assert.deepEqual(res.result, {});
    assert.strictEqual(res.state, "waiting");
    assert.strictEqual(res.id, undefined);
  });

  it('init with id', function() {
    var res = new Resource({id: 5, result: "bar2", data: {foo: "bar"}, state: "finished"});
    assert.deepEqual(res.data, {foo: "bar"});
    assert.strictEqual(res.result, "bar2");
    assert.strictEqual(res.state, "finished");
    assert.strictEqual(res.id, 5);
  });

  it('serialize()', function() {
    var res = new Resource({id: 5, result: "bar2", data: {foo: "bar"}, state: "finished"});
    var jobj = res.serialize();
    assert.deepEqual(jobj.data, {foo: "bar"});
    assert.strictEqual(jobj.result, "bar2");
    assert.strictEqual(jobj.state, "finished");
    assert.strictEqual(jobj.id, 5);
  })

  it('should emit the event changedState when starting', function(done) {
    var res = new Resource({data: "bim"});
    var noop = function() {
      return;
    };
    res.once("changedState", function(cb) {
      assert.strictEqual(noop, cb);
      assert.strictEqual(this.state, "running");
      assert.strictEqual(this.data, "bim");
    });
    res.start(noop);
    // make sure the event was dispatched
    process.nextTick(function() {
      res.start(function(err, res) {
        assert.strictEqual(err, "Can't start a resource already started");
        done();
      });
    });
  });

  it('should emit the event changedState when finishing', function(done) {
    var res = new Resource({data: "bim"});
    var noop = function() {
      return;
    };
    res.start(function() { return; });
    res.on("changedState", function(cb) {
      assert.strictEqual(noop, cb);
      assert.strictEqual(this.state, "finished");
      assert.strictEqual(this.data, "bim");
      assert.strictEqual(this.result, "foo");
    });
    res.finish("foo", noop);
    // make sure the event was dispatched
    process.nextTick(function() {
      res.finish("lam", function(err, result) {
        assert.strictEqual(err, "Can't finish a resource not running");
        assert.strictEqual(res.result, "foo")
        done();
      });
    })
  });

  it('should emit the event changedState when failing', function(done) {
    var res = new Resource({data: "bim"});
    var noop = function() {
      return;
    };
    res.start(function() { return; });
    res.on("changedState", function(cb) {
      assert.strictEqual(noop, cb);
      assert.strictEqual(this.state, "failed");
      assert.strictEqual(this.data, "bim");
      assert.strictEqual(this.result, "bar");
    });
    res.fail("bar", noop);
    // make sure the event was dispatched
    process.nextTick(function() {
      res.fail("lam", function(err, result) {
        assert.strictEqual(err, "Can't fail a resource not running");
        assert.strictEqual(res.result, "bar")
        done();
      });
    })
  });
});
