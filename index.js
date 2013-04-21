/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * creates a new Handler if resourceFactory is undefined
 * it uses the TimestampResourceFactory
 */
var JobberTrack = function(client, resourceFactory) {
  this.client = client;
  if (resourceFactory) {
    this.resourceFactory = resourceFactory;
  } else {
    this.resourceFactory = new TimestampResourceFactory();
  }
};

/**
 * set the general timeout
 */
JobberTrack.prototype.setDefaultTimeout = function(time) {
  this.timeout = time;
};

/**
 * Create a new resource that will last "timeout"
 * (if timeout is not defined is uses the general default timeout if it was set)
 */
JobberTrack.prototype.create = function(timeout, callback) {
  var that = this;
  if (typeof(timeout) == "function" && !callback) {
    callback = timeout;
    if (this.timeout) {
      timeout = this.timeout;
    } else {
      callback("timeout not defined");
      return;
    }
  }
  var res = that.resourceFactory.create(that.client);
  that.client.set(res.id, res.getValue(), function(err, reply) {
    if (err) {
      callback("couldn't set the object");
    }
    that.client.expire(res.id, timeout, function(err, reply) {
      if (err) {
        callback("error on setting timeout");
      }
      callback(false, res);
    });
  });
};

/**
 * Returns the resource identified by the key "id"
 */
JobberTrack.prototype.get = function(id, callback) {
  var that = this;
  this.client.get(id, function(err, reply) {
    if (err) {
      callback(err);
    }
    that.resourceFactory.load(that.client, id, reply);
    callback(false, reply);
  });
}

/**
 * Create a new Resource with the id "id"
 */
var Resource = function(client, id) {
  this.client = client;
  this.id = id;
  this.state = "waiting";
};

/**
 * Returns the content of the redis value
 */
Resource.prototype.getValue = function() {
  var res = {state: this.state};
  if (this.data) {
    res.data = this.data;
  }
  return res;
};

/**
 * Set the content from the result of redis query
 */
Resource.prototype.setValue = function(reply) {
  this.state = reply.state;
  if (reply.data) {
    this.data = reply.data;
  }
};

/**
 * Set the state of the resource as running
 */
Resource.prototype.start = function(callback) {
  if (this.state !== "waiting") {
    callback("Can't start a resource that is not waiting");
    return;
  }
  this._changeState("running", callback);
};

/**
 * Set the state of the resource as failed
 */
Resource.prototype.fail = function(callback) {
  if (this.state !== "running") {
    callback("Can't fail a resource not running");
    return;
  }
  this._changeState("failed", callback);
};

/**
 * set the state of the resource as finished the Resource and set data to it
 */
Resource.prototype.finish = function(data, callback) {
  if (this.state !== "running") {
    callback("Can't fail a resource not running");
    return;
  }
  this.data = data;
  this._changeState("finished", callback);
}

/**
 * Change the state of the Resource
 */
Resource.prototype._changeState = function(state, callback) {
  this.state = state;
  this.client.set(this.id, this.getValue(), callback);
};

/**
 * A basic ResourceFactory that creates ids depending on the current timestamp
 */
var TimestampResourceFactory = function() {
};

TimestampResourceFactory.prototype.create = function(client) {
  return new Resource(client, new Date().getTime());
};

TimestampResourceFactory.prototype.load = function(client, id, reply) {
  res = new Resource(client, id);
  res.setValue(reply);
}

module.exports = {Handler: JobberTrack, Resource: Resource};
