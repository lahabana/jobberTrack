jobberTrack - A simple way to create and see the status of jobs with redis
===========================

[![Build Status](https://travis-ci.org/lahabana/jobberTrack.png)](https://travis-ci.org/lahabana/jobberTrack)


It uses redis to store objects with their state and store extra information when it is finished.

## Installation

    npm install jobber-track
    npm test

## Example

```js
    var client = redis.createClient("","","");
    var track = new JobberTrack.Handler(client);
    // create a new job
    track.create(12, function(err, job) {
        // Start the job
        job.start(function(err, reply) {
            // what you need to do
            job.finish("some data to store", function(err, reply) {
                // The job is finished
            });
        });
    });

    // get the state of a job
    var client = redis.createClient("","","");
    var track = new JobberTrack.Handler(client);
    // create a new job
    track.get("job id", function(err, job) {
        if (job.state == "finished") {
            console.log(job.data);
        }
    });
```

## Attention

> There is no concistency guarantee never start/finish/fail a job you haven't created. You should only check the status of the jobs you haven't created. MODIFYING THEM WILL CREATE INCONSISTENCY.

## API

### JobberTrack.Handler

`new JobberTrack.Handler(redisClient, resourceFactory)` Creates a new JobberTrack ressourceFactory is optional if it is not provided we will use local timestamps as keys.

`setDefaultTimeout(timeout)` set the default timeout of all the jobs created by this JobberTrack to `timeout`

`create(timeout, callback)` Creates a new job with the status 'waiting' and call callback(err, resource) where resource is a JobberTrack.Resource . timeout can be omited if it has been set previously for the JobberTrack using `setDefaultTimeout()`

`get(id, callback)` Look for the object with the key 'id' and calls callback(err, resource) where resource is the resource loaded from the redis store.

### JobberTrack.Resource

A resource can have 4 states: waiting, running, failed, finished. running is only accessible from waiting and failed or finished is only accessible from running.

`new JobberTrack.Resource(client, id)` this should only be called through a factory and by `JobberTrack.create()`. Creates a new Resource and will use the redis client `client` and the key `id`.

`start(callback)` set the status of the job to `running`

`fail(callback)` set the status of the job to `failed`

`finish(data, callback)` set the status of the job to `finished` and add to the key-value store the data.

`getValue()` returns what is stored in the redis (it is not automatically updated when it is changed on the redis store).

`setValue(reply)` sets the content of the Resource according to what was returned by the redis store

### ResourceFactory
Create your own resource factory if you want to change the way ids are created.

`create(client)` Creates an new JobberTrack.Resource that will use the client `client`.

`load(client, id, reply)` Loads the object from an already existing key-value in the redis store


## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

