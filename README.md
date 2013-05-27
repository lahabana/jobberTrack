jobberTrack - A simple way to create and see the status of jobs with redis
===========================

[![Build Status](https://travis-ci.org/lahabana/jobberTrack.png)](https://travis-ci.org/lahabana/jobberTrack)


It uses redis to store objects with their state and store extra information at creation or when it is finished.
The jobs are queued in redis FIFO and you can use a blocking queue to retrieve them.

## Installation

    npm install jobber-track
    npm test

## Example

```js
    var jobberTrack = require('jobber-track');
    var client = redis.createClient("","","");
    jobberTrack(client, "yourHash", function(err, track) {
        // create a new job and put it in the waiting queue
        track.createAndPush({"some": "data"}, function(err, id) {
            // Whatever (id is the id of the job)
        });

        // get the first job and start it
        // !!! If no job is present it will block the process until one is available
        track.popAndStart(id, function(err, job) {
            // The job as as a status "running"
            someComplicateThings(resource.data, function(err, result) {
                if (err) { // An error occured we indicate the job as failed
                    return job.fail([err], function(err, resource) {
                        console.log(resource.result);
                    });
                }
                // All went right we finish the job
                job.finish(result, function(err, result) {
                    console.log(result);
                });
            });
        });
    });
```

## API

### JobberTrack

`JobberTrack(client, id, callback)` creates a new tracker and load the necessary scripts in Redis. `client` is a redis client, `id` is the first part of the key for all elements created in redis (ex `wideor:1:nb`). `callback(err, tracker)` is called once we have loaded all the scripts in redis, `tracker` is our usable tracker.

### Tracker

A queue enables to queue waiting jobs in a redis list and to pop and start them.

`new Tracker(client, id)` creates a new queue with the key `id:queue`.

`loadScripts(callback)` loads the necessary scripts in redis. To avoid having to call this use directly `jobberTracker(client, id)`.

`createAndPush(data, callback)` creates a new resource add it to resource and then push it to the waiting queue. data is a json object with necessary data for the job (Resource.data). `callback(err, id)` is triggered once everything is finished id is the id of the resource in redis.

`popAndStart(resource, callback)` pops the first element from the waiting queue and starts the associated resource. `callback(err, resource)` where resource is the popped associated resource. `popAndStart()` is a blocking method it will block until it can get an element from the queue (uses redis' BRPOP).

`get(id, callback)` gets the Resource `id` from the redis store this can be a resource in any state. It is preferable to never modify this Resource if you are using the Tracker's queue. `callback(err, resource)` where resource is the resource retrieved.

### Resource

A resource can have 4 states: waiting, running, failed, finished. running is accessible from any state except running and failed or finished is only accessible from running.

`new Resource(data)` data is a serialized (json object) version of a Resource. It can contain `data`, `result`, `id` and `state`

`start(callback)` set the status of the job to `running` emits the event "stateChanged" with the callback as a parameter (!!! Don't use this method when using the Tracker's queue as it will cause problem - you are not supposed to start arbitrary jobs but take them from the queue - !!!).

`fail(callback)` set the status of the job to `failed` emits the event "stateChanged" with the callback as a parameter

`finish(data, callback)` set the status of the job to `finished` emits the event "stateChanged" with the callback as a parameter

`data` the data that has been stored upon creation. Default: {}

`result` the data that has been stored when finishing. Default: {}

`state` the state of the resource. Default: "waiting"

`id` the id of the job (this doesn't include the start hash i.e: an object in redis with the key `wideor:1` will have as id `1`). Default: undefined

## TODO

- Provide a set in case you don't want to use a queue.
- Provide a delete to remove a job.
- Provide a non blocking pop.

## MIT License
Copyright (c) 2013 Charly Molter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

