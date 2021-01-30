require('../setup');
const Metrics = require('../../src/index')

describe('Timer', function () {
  let t1, t2, metrics;
  const times1 = [];
  const times2 = [];

  function onMetric (topic, data) {
    if (data.key === 'pre.' + hostName + '.test.one.one') {
      times1.push(data.value);
    } else if (data.key === 'pre.' + hostName + '.test.one.two') {
      times2.push(data.value);
    }
  }

  before(function (done) {
    process.title = 'test';
    metrics = Metrics({ prefix: 'pre' });
    metrics.on('metric', onMetric);
    t1 = metrics.timer('one.one');
    setTimeout(function () {
      t2 = metrics.timer(['one', 'two']);
      done();
    }, 10);
  });

  it('should keep timers separate', function () {
    t1.record();
    t2.record();
    times1[0].should.be.greaterThan(times2[0]);
  });

  it('should track time from start', function (done) {
    setTimeout(function () {
      t1.record();
      t2.record();
      times1[1].should.be.greaterThan(times1[0]);
      times2[1].should.be.greaterThan(times2[0]);
      done();
    }, 10);
  });

  it('should track time from reset', function (done) {
    t1.reset();
    t2.reset();
    setTimeout(function () {
      t1.record().should.be.lessThan(15);
      t2.record().should.be.lessThan(15);
      done();
    }, 10);
  });

  it('should capture all recorded durations', function () {
    times1.length.should.equal(3);
    times2.length.should.equal(3);
  });

  after(function () {
    if (metrics) {
      metrics.removeListener('metric', onMetric);
    }
  });
});
