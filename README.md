jobberTrack - A simple way to create and see the status of jobs with redis
===========================
It uses redis to store objects with their state and store extra information when it is finished.

## Example

```js
    var client = redis.createClient("","","");
    var track = new JobberTrack(client);
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
    var track = new JobberTrack(client);
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

### JobberTrack.Resource

A resource can have 4 states: waiting, running, failed, finished. running is only accessible from waiting and failed or finished is only accessible from running.

`new JobberTrack.Resource(client, id)` this should only be called through a factory and by `JobberTrack.create()`. Creates a new Resource and will use the redis client `client` and the key `id`.

`start(callback)` set the status of the job to `running`

`fail(callback)` set the status of the job to `failed`

`finish(data, callback)` set the status of the job to `finished` and add to the key-value store the data.

`getValue()` returns what is stored in the redis (it is not automatically updated when it is changed on the redis store).

### ResourceFactory
Create your own resource factory if you want to change the way ids are created.

`create(client)` Creates an new JobberTrack.Resource that will use the client `client`.

