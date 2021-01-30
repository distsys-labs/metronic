require('../setup');

describe('Instrumentation', function () {
  describe('successful promise', function () {
    const collected = [];
    let metrics, resolution;
    before(function () {
      process.title = 'test';
      metrics = require('../../src/index')({ prefix: 'metronics' });
      metrics.on('metric', function (topic, data) {
        if (data.type === 'time') {
          data.value = 1;
        }
        collected.push({ key: data.key, value: data.value });
      });
      return metrics.instrument({
        key: ['a', 'promise'],
        call: function () {
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve('done');
            }, 200);
          });
        },
        success: function (x) {
          resolution = x;
        },
        counters: ['attempted', 'succeeded']
      });
    });

    it('should resolve promise', function () {
      resolution.should.equal('done');
    });

    it('should capture expected metrics', function () {
      collected.should.eql([
        { key: metrics.prefix + '.a.promise.attempted', value: 1 },
        { key: metrics.prefix + '.a.promise.succeeded', value: 1 },
        { key: metrics.prefix + '.a.promise.duration', value: 1 }
      ]);
    });

    after(function () {
      metrics.removeAllListeners();
    });
  });

  describe('failed promise', function () {
    const collected = [];
    let metrics, resolution;
    before(function () {
      process.title = 'test';
      metrics = require('../../src/index')({ prefix: 'metronics' });
      metrics.on('metric', function (topic, data) {
        if (data.type === 'time') {
          data.value = 1;
        }
        collected.push({ key: data.key, value: data.value });
      });
      return metrics.instrument({
        key: ['a', 'promise'],
        call: function () {
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              reject(new Error('done'));
            }, 200);
          });
        },
        failure: function (x) {
          resolution = x;
        }
      });
    });

    it('should reject promise', function () {
      resolution.should.eql(new Error('done'));
    });

    it('should capture expected metrics', function () {
      collected.should.eql([
        { key: metrics.prefix + '.a.promise.attempted', value: 1 },
        { key: metrics.prefix + '.a.promise.failed', value: 1 },
        { key: metrics.prefix + '.a.promise.duration', value: 1 }
      ]);
    });

    after(function () {
      metrics.removeAllListeners();
    });
  });

  describe('successful callback', function () {
    const collected = [];
    let metrics, resolution;
    before(function () {
      process.title = 'test';
      metrics = require('../../src/index')({ prefix: 'metronics' });
      metrics.on('metric', function (topic, data) {
        if (data.type === 'time') {
          data.value = 1;
        }
        collected.push({ key: data.key, value: data.value });
      });
      return metrics.instrument({
        key: ['a', 'promise'],
        call: function (cb) {
          setTimeout(function () {
            cb(null, 'done');
          }, 200);
        },
        success: function (x) {
          resolution = x;
        }
      });
    });

    it('should resolve promise', function () {
      resolution.should.equal('done');
    });

    it('should capture expected metrics', function () {
      collected.should.eql([
        { key: metrics.prefix + '.a.promise.attempted', value: 1 },
        { key: metrics.prefix + '.a.promise.succeeded', value: 1 },
        { key: metrics.prefix + '.a.promise.duration', value: 1 }
      ]);
    });

    after(function () {
      metrics.removeAllListeners();
    });
  });

  describe('failed callback', function () {
    const collected = [];
    let metrics, resolution;
    const error = new Error('error');
    before(function () {
      process.title = 'test';
      metrics = require('../../src/index')({ prefix: 'metronics' });
      metrics.on('metric', function (topic, data) {
        if (data.type === 'time') {
          data.value = 1;
        }
        collected.push({ key: data.key, value: data.value });
      });

      return metrics.instrument({
        key: ['a', 'promise'],
        call: function (cb) {
          setTimeout(function () {
            cb(error);
          }, 200);
        }
      })
        .then(null, function (err) {
          resolution = err;
        });
    });

    it('should resolve promise', function () {
      resolution.should.equal(error);
    });

    it('should capture expected metrics', function () {
      collected.should.eql([
        { key: metrics.prefix + '.a.promise.attempted', value: 1 },
        { key: metrics.prefix + '.a.promise.failed', value: 1 },
        { key: metrics.prefix + '.a.promise.duration', value: 1 }
      ]);
    });

    after(function () {
      metrics.removeAllListeners();
    });
  });

  describe('callback with only failure counter', function () {
    const collected = [];
    let metrics, resolution;
    const error = new Error('error');
    before(function () {
      process.title = 'test';
      metrics = require('../../src/index')({ prefix: 'metronics' });
      metrics.on('metric', function (topic, data) {
        if (data.type === 'time') {
          data.value = 1;
        }
        collected.push({ key: data.key, value: data.value });
      });

      return metrics.instrument({
        key: ['a', 'promise'],
        call: function (cb) {
          setTimeout(function () {
            cb(error);
          }, 200);
        },
        counters: ['failed'],
        duration: false
      })
        .then(null, function (err) {
          resolution = err;
        });
    });

    it('should resolve promise', function () {
      resolution.should.equal(error);
    });

    it('should capture expected metrics', function () {
      collected.should.eql([
        { key: metrics.prefix + '.a.promise.failed', value: 1 }
      ]);
    });

    after(function () {
      metrics.removeAllListeners();
    });
  });

  describe('promise with custom namespace', function () {
    const collected = [];
    let metrics, resolution;
    before(function () {
      process.title = 'test';
      metrics = require('../../src/index')({ prefix: 'metronics' });
      metrics.on('metric', function (topic, data) {
        if (data.type === 'time') {
          data.value = 1;
        }
        collected.push({ key: data.key, value: data.value });
      });
      return metrics.instrument({
        key: ['a', 'promise'],
        namespace: ['one', 'two'],
        call: function () {
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve('done');
            }, 200);
          });
        },
        success: function (x) {
          resolution = x;
        },
        counters: ['attempted', 'succeeded']
      });
    });

    it('should resolve promise', function () {
      resolution.should.equal('done');
    });

    it('should capture expected metrics', function () {
      collected.should.eql([
        { key: 'one.two.a.promise.attempted', value: 1 },
        { key: 'one.two.a.promise.succeeded', value: 1 },
        { key: 'one.two.a.promise.duration', value: 1 }
      ]);
    });

    after(function () {
      metrics.removeAllListeners();
    });
  });
});
