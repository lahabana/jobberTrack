/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * Create a new Resource from a serialized one
 * data is a json that can contain {id, data, result, state};
 */
Resource = function(data) {
  EventEmitter.call(this);
  if (!data) {
    throw new Error("data should at least have data defined");
  }
  if (data.id) {
    this.id = data.id;
  }
  this.data = data.data || {};
  this.result = data.result || {};
  this.state = data.state || "waiting";
};
util.inherits(Resource, EventEmitter);

(function() {
  /**
   * Set the state of the resource to started and
   * emit a changedState event with the `callback` as parameter
   */
  this.start = function(callback) {
    if (this.state === "running") {
      return callback("Can't start a resource already started");
    }
    this._changeState("running", callback);
  };

  /**
   * Set the state of the resource as failed, set the result to `data`
   * and emit a changedState event with the `callback` as parameter
   */
  this.fail = function(data, callback) {
    if (this.state !== "running") {
      return callback("Can't fail a resource not running");
    }
    this.result = data;
    this._changeState("failed", callback);
  };

  /**
   * Set the state of the resource as finished, set the result to `data`
   * and emit a changedState event with the `callback` as parameter
   */
  this.finish = function(data, callback) {
    if (this.state !== "running") {
      return callback("Can't finish a resource not running");
    }
    this.result = data;
    this._changeState("finished", callback);
  }

  /**
   * Change the state of the Resource and emit the changetState event
   * with callback as parameter
   */
  this._changeState = function(state, callback) {
    this.state = state;
    this.emit("changedState", callback);
  };

  this.serialize = function() {
    return {
      id: this.id,
      data: this.data,
      result: this.result,
      state: this.state
    };
  }
}).call(Resource.prototype);

module.exports = Resource;
