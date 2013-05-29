/*
## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var Resource = require('./resource');
var crypto = require('crypto');
/**
 * Create a new queue of waiting jobs identified by "id" on the client
 */
var Tracker = function(client, id) {
  this.client = client;
  this.id = id;
};

(function() {
  /**
   * Create a sha1 hash from a script
   */
  var createHash = function(str) {
    var shasum = crypto.createHash('sha1');
    shasum.update(str);
    return shasum.digest('hex');
  };

  /**
   * Look in redis to see if the script already exist
   * if not load them
   */
  this.loadScripts = function(callback) {
    var i = 0;
    var that = this;
    var scripts = {
      create: 'local id\n\
              id = redis.call("INCR", "' + that.id + ':nb")\n\
              redis.call("SET", "' + that.id + ':"' + '..id..":data", ARGV[1])\n\
              redis.call("SET", "' + that.id + ':"' + '..id..":state", "waiting")\n\
              redis.call("LPUSH", "' + that.id + ':queue", id)\n\
              return id',
      start: 'local data\n\
              data = redis.call("GET", "' + that.id + ':"..' + 'KEYS[1]..":data")\n\
              redis.call("SET", "' + that.id + ':"..' + 'KEYS[1]..":state", "running")\n\
              return data',
      get: 'local data\n\
            local state\n\
            local result\n\
            data = redis.call("GET", "' + that.id + ':"..KEYS[1]..":data")\n\
            if not data then\n\
              return false\n\
            end\n\
            state = redis.call("GET", "' + that.id + ':"..KEYS[1]..":state")\n\
            result = redis.call("GET", "' + that.id + ':"..KEYS[1]..":result")\n\
            return {data, state, result}',
      changeState: 'redis.call("SET", "' + that.id + ':"..KEYS[1]..":result", ARGV[1])\n\
                    return redis.call("SET", "' + that.id + ':"..KEYS[1]..":state", ARGV[2])'
    };

    // Create all the SHA1 hashes from the LUA commands
    that._hashes = {};
    for (i in scripts) {
      if (scripts.hasOwnProperty(i)) {
        that._hashes[i] = createHash(scripts[i]);
      }
    }
    var order = ["create", "start", "get", "changeState"];
    // Check if all those scripts are already loaded into redis
    that.client.script('exists', that._hashes.create, that._hashes.start,
                                  that._hashes.get, that._hashes.changeState, function(err, reply) {
      if (err) {
        return callback(err);
      }

      // Look at all the results and load the scripts which are not loaded yet
      // (this will usually be a none or all situation)
      var finished = 0;
      var loadScript = function(i) {
        if (reply[i] === 0) {
          that.client.script('load', scripts[order[i]], function(err, result) {
            if (err) {
              return callback(err);
            }
          });
        }
        finished += 1;
        if (finished === order.length) {
          return callback(false, that);
        }
        loadScript(i + 1);
      };
      loadScript(0);
    });
  };

  /**
   * Creates a new element and push it in the queue of waiting jobs
   * returns a callback(err, id) where id is the id of the created resource
   */
  this.createAndPush = function(data, callback) {
    var that = this;

    var resource = new Resource({data: data});
    that.client.evalsha(that._hashes.create, 0, JSON.stringify(resource.data), function(err, res) {
      if (err || res === 0) {
        return callback(err);
      }
      callback(false, res);
    });
  };

  /**
   * Pops a job checks and start the job. callback(err, resource)
   * where resource is the actual result
   * This is a blocking function it will block until there
   * is an element in the queue.
   */
  this.popAndStart = function(callback) {
    var that = this;
    that.client.brpop(that.id + ':queue', 0, function(err, reply) {
      if (err || reply === null) {
        callback(err);
        return;
      }
      var id = reply[1];

      that.client.evalsha(that._hashes.start, 1, id, function(err, reply) {
        if (err) {
          return callback(err);
        }
        var resource = new Resource({id: id, data: JSON.parse(reply), state: "running"});
        resource.once("changedState", function(cb) {
          that._changeState(this, cb);
        });
        return callback(false, resource);
      });
    });
  };

  /**
   * Returns if it exists the resource identified by id callback is of type: (err, resource)
   */
  this.get = function(id, callback) {
    var that = this;

    that.client.evalsha(that._hashes.get, 1, id, function(err, reply) {
      var resource;
      if (err) {
        return callback(err);
      }
      if (reply === null) {
        return callback(false, null);
      }
      var data = {
        id: id,
        data: JSON.parse(reply[0]),
        state: reply[1],
        result: reply[2] !== null ? JSON.parse(reply[2]) : {}
      };
      resource = new Resource(data);
      return callback(false, resource);
    });
  };

  /**
   * Change the state of resource passed in argument it is preferable to
   * use this method only to finish or fail a resource as it will set id:result
   */
  this._changeState = function(resource, callback) {
    var that = this;

    that.client.evalsha(that._hashes.changeState, 1, resource.id,
                    JSON.stringify(resource.result), resource.state, function(err, reply) {
      if (err) {
        return callback(err);
      }
      return callback(false, resource);
    });
  };
}).call(Tracker.prototype);

module.exports = Tracker;
