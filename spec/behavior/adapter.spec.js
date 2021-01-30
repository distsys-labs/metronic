require('../setup');

function createAdapter () {
  return {
    durations: [],
    metrics: [],
    convert: undefined,
    onMetric: function (data) {
      if (data.type === 'time') {
        this.durations.push(data);
      } else {
        this.metrics.push(data);
      }
    },
    setConverter: function (convert) {
      this.convert = convert;
    }
  };
}

describe('Adapters', function () {
  let adapter, convert, timer, meter, metrics, memUsage;
  before(function () {
    process.title = 'test';
    metrics = require('../../src/index')();
    adapter = createAdapter();
    metrics.use(adapter);
    metrics.useLocalAdapter();
    convert = require('../../src/converter');
    timer = metrics.timer('one');
    meter = metrics.meter('two');
    memUsage = metrics.metric('bytes', 'memUsage', 'MB');
    metrics.recordUtilization();
    timer.record();
    timer.record();
    metrics.recordUtilization();
    meter.record();
    meter.record();
    meter.record();
    metrics.recordUtilization();
    memUsage.record(1);
  });

  it('should capture durations', function () {
    adapter.durations.length.should.equal(2);
  });

  it('should capture custom metric', function () {
    return adapter.metrics[30].should.partiallyEql({
      key: hostName + '.test.memUsage',
      type: 'bytes',
      units: 'b',
      value: 1048576
    });
  });

  it('should capture counts', function () {
    adapter.metrics.length.should.equal(31);
  });

  it('should set converter', function () {
    adapter.convert.should.equal(convert);
  });

  it('should produce report', function () {
    const report = metrics.getReport();
    report.should.have.all.keys(
      [
        hostName,
        hostName + '.test'
      ]);
    report[hostName + '.test'].should.have.all.keys(
      [
        'heap-allocated',
        'heap-used',
        'memUsage',
        'physical-allocated',
        'core-0-load',
        'core-1-load',
        'core-2-load',
        'one',
        'two'
      ]);
    report[hostName].should.have.all.keys(
      [
        'memory-total',
        'memory-allocated',
        'memory-available'
      ]);
  });

  describe('after removing adapter', function () {
    before(function () {
      metrics.removeAdapters();
      timer.record();
      meter.record();
    });

    it('should not increase captured durations', function () {
      adapter.durations.length.should.equal(2);
    });

    it('should not increase captured counts', function () {
      adapter.metrics.length.should.equal(31);
    });
  });

  describe('with utilization interval', function () {
    let collector, meters;
    before(function (done) {
      collector = createAdapter();
      metrics.use(collector);
      const initial = metrics.recordUtilization(100);
      meters = 6 + initial.loadAverage.length;
      setTimeout(function () {
        metrics.cancelInterval();
        done();
      }, 1000);
    });

    it('should have captured multiple intervals', function () {
      collector.metrics.length.should.equal(10 * meters);
    });

    after(function () {
      metrics.removeAdapters();
    });
  });
});
