require('../setup');

describe('Meter', function () {
  const counts = {};
  const segments = ['counter', 'two'];
  before(function (done) {
    process.title = 'test';
    const metrics = require('../../src/index')();
    metrics.on('metric', function (topic, data) {
      counts[data.key] = data.value;
    });
    const meter1 = metrics.meter('counter.one');
    const meter2 = metrics.meter(segments);
    meter1.record();
    meter2.record(2);
    process.nextTick(done);
  });

  it('should emit counters', function () {
    const key1 = hostName + '.test.counter.one';
    const key2 = hostName + '.test.counter.two';
    const expected = {};
    expected[key1] = 1;
    expected[key2] = 2;
    counts.should.eql(expected);
  });

  it('should not mutate key array', function () {
    segments.should.eql(['counter', 'two']);
  });
});
