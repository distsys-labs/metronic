require('../setup');

describe('Parent Namespace', function () {
  const collected = [];
  let subscription;
  let metrics;
  before(function (done) {
    process.title = 'test';
    metrics = require('../../src/index')({ prefix: 'metronics' });
    subscription = metrics.on('metric', (topic, data) => {
      collected.push(data.key);
    });
    const meter = metrics.meter('meter', undefined, 'test');
    const timer = metrics.timer('timer', 'test');
    meter.record();
    timer.record();
    process.nextTick(done);
  });

  it('should make prefix available', function () {
    metrics.prefix.should.equal(['metronics', hostName, process.title].join('.'));
  });

  it('should prefer namespace over prefix', function () {
    collected.should.eql([
      'test.meter',
      'test.timer'
    ]);
  });

  after(function () {
    metrics.removeAllListeners();
  });
});
