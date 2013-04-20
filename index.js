/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var JobberTrack = function(client, resourceFactory) {
  this.client = client;
  if (resourceFactory) {
    this.resourceFactory = resourceFactory;
  } else {
    this.resourceFactory = new TimestampResourceFactory();
  }
};

JobberTrack.prototype.setDefaultTimeout = function(time) {
  this.timeout = time;
};

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

JobberTrack.prototype.get = function(id, callback) {
  this.client.get(id, callback);
}

var Resource = function(client, id) {
  this.client = client;
  this.id = id;
  this.state = "waiting";
};

Resource.prototype.getValue = function() {
  var res = {state: this.state};
  if (this.data) {
    res.data = this.data;
  }
  return res;
};

Resource.prototype.start = function(callback) {
  if (this.state !== "waiting") {
    callback("Can't start a resource that is not waiting");
    return;
  }
  this._changeState("running", callback);
};

Resource.prototype.fail = function(callback) {
  if (this.state !== "running") {
    callback("Can't fail a resource not running");
    return;
  }
  this._changeState("failed", callback);
};

Resource.prototype.finish = function(data, callback) {
  if (this.state !== "running") {
    callback("Can't fail a resource not running");
    return;
  }
  this.data = data;
  this._changeState("finished", callback);
}

Resource.prototype._changeState = function(state, callback) {
  this.state = state;
  this.client.set(this.id, this.getValue(), callback);
};

var TimestampResourceFactory = function() {
};

TimestampResourceFactory.prototype.create = function(client) {
  return new Resource(client, new Date().getTime());
};

/*JobberTrack.prototype.start = function(elt, callback) {
  callback();
};*/
module.exports = {Handler: JobberTrack, Resource: Resource};
