const _ = require('fauxdash');
const Dispatcher = require('topic-dispatch');
const metrics = require('./metricsAdapter');
const systemMetrics = require('./system');
const os = require('os');
const convert = require('./converter');
let hostName, processTitle;

const timeConversions = {
  ns: 1,
  us: 1e3,
  ms: 1e6,
  s: 1e9
};

const defaults = {
  delimiter: '.',
  byteUnits: 'b',
  timeUnits: 'ms',
  prefix: undefined
};

function cancelInterval () {
  this.intervalCancelled = true;
}

function combineKey (config, parts) {
  return _.filter(parts).join(config.delimiter);
}

function convertBytes (config, bytes, units) {
  return convert(bytes, units, config.byteUnits);
}

function convertTime (config, time) {
  const ns = (time[0] * 1e9) + time[1];
  return ns / timeConversions[config.timeUnits];
}

function createApi (config) {
  processTitle = process.title;
  hostName = os.hostname();
  const api = { config };
  api.prefix = combineKey(config, [config.prefix, hostName, processTitle]);
  api.cancelInterval = cancelInterval.bind(api);
  api.convert = convert;
  api.emitMetric = emitMetric.bind(api);
  api.getReport = metrics.getReport;
  api.instrument = instrument.bind(null, api, config);
  api.intervalCancelled = false;
  api.meter = createMeter.bind(api, config);
  api.metric = createMetric.bind(null, api, config);
  api.recordUtilization = recordUtilization.bind(api, config);
  api.removeAdapters = removeAdapters.bind(api);
  api.resetReport = metrics.getReport.bind(null, true);
  api.timer = createTimer.bind(api, config);
  api.useLocalAdapter = useLocalAdapter.bind(api);
  api.use = useAdapter.bind(api);
  return _.melter(api, Dispatcher());
}

function createMeter (config, key, units, parentNamespace) {
  return createMetric(this, config, 'meter', key, units, parentNamespace);
}

function createMetric (api, config, type, key, units, parentNamespace) {
  const combinedKey = getKey(config, key, parentNamespace);
  units = units || 'count';
  return {
    record: recordMetric.bind(null, api, config, type, units, combinedKey)
  };
}

function createTimer (config, key, parentNamespace) {
  const info = {
    key: getKey(config, key, parentNamespace),
    start: process.hrtime()
  };
  return {
    reset: function () {
      info.start = process.hrtime();
    },
    record: recordTime.bind(null, this, config, info)
  };
}

function emitMetric (type, units, key, value, metadata) {
  const metric = _.melter({}, {
    type: type,
    key: key,
    value: value,
    units: units,
    timestamp: Date.now()
  }, metadata || {});
  this.emit('metric', metric);
}

function getKey (config, key, parentNamespace) {
  let parts = _.isString(key) ? [key] : key.slice();
  if (parentNamespace) {
    if (_.isString(parentNamespace)) {
      parts.unshift(parentNamespace);
    } else {
      parts = parentNamespace.concat(parts);
    }
  } else {
    parts.unshift(processTitle);
    parts.unshift(hostName);
    parts.unshift(config.prefix);
  }
  return combineKey(config, parts);
}

function instrument (api, config, options) {
  const key = _.isString(options.key) ? [options.key] : options.key.slice();
  const timerKey = key.concat('duration');
  const units = options.units || 'count';
  const attemptKey = getKey(config, key.concat('attempted'), options.namespace);
  const successKey = getKey(config, key.concat('succeeded'), options.namespace);
  const failKey = getKey(config, key.concat('failed'), options.namespace);
  const countAttempts = options.counters === undefined || _.contains(options.counters, 'attempted');
  const countSuccesses = options.counters === undefined || _.contains(options.counters, 'succeeded');
  const countFailures = options.counters === undefined || _.contains(options.counters, 'failed');
  const args = _.getArguments(options.call);

  const timerInfo = {
    key: getKey(config, timerKey, options.namespace),
    start: process.hrtime()
  };

  function recordDuration () {
    if (options.duration !== false) {
      const durationMeta = _.clone(options.metadata);
      if (durationMeta && durationMeta.name) {
        durationMeta.name += '_DURATION';
      }
      recordTime(api, config, timerInfo, durationMeta);
    }
  }

  function onSuccess (result) {
    if (countSuccesses) {
      const successMeta = _.clone(options.metadata);
      if (successMeta && successMeta.name) {
        successMeta.name += '_SUCCEEDED';
      }
      recordMetric(api, config, 'meter', units, successKey, 1, successMeta);
    }
    recordDuration();
    if (options.success) {
      return options.success(result);
    } else {
      return result;
    }
  }

  function onFailure (err) {
    if (countFailures) {
      const failureMeta = _.clone(options.metadata);
      if (failureMeta && failureMeta.name) {
        failureMeta.name += '_FAILED';
      }
      recordMetric(api, config, 'meter', units, failKey, 1, failureMeta);
    }
    recordDuration();

    if (options.failure) {
      return options.failure(err);
    } else {
      return err;
    }
  }

  if (countAttempts) {
    const attemptMeta = _.clone(options.metadata);
    if (attemptMeta && attemptMeta.name) {
      attemptMeta.name += '_ATTEMPTED';
    }
    recordMetric(api, config, 'meter', units, attemptKey, 1, attemptMeta);
  }

  if (args[0]) {
    return new Promise(function (resolve, reject) {
      options.call(function (err, result) {
        if (err) {
          reject(onFailure(err) || err);
        } else {
          resolve(onSuccess(result));
        }
      });
    });
  } else {
    return options.call().then(onSuccess, onFailure);
  }
}

function recordMetric (api, config, type, units, key, value, metadata) {
  if (type === 'bytes') {
    value = convertBytes(config, value, units);
    units = config.byteUnits;
  }
  api.emitMetric(type, units, key, value || 1, metadata);
  return value;
}

function recordTime (api, config, info, metadata) {
  const diff = process.hrtime(info.start);
  const duration = convertTime(config, diff);
  api.emitMetric('time', config.timeUnits, info.key, duration, metadata);
  return duration;
}

function recordUtilization (config, interval, metadata) {
  if (_.isObject(interval)) {
    metadata = interval;
    interval = undefined;
  }
  const utilization = systemMetrics();
  const system = utilization.systemMemory;
  const proc = utilization.processMemory;
  function setName (name) {
    return _.melter({}, metadata || {}, { name });
  }
  recordMetric(
    this,
    config,
    'bytes',
    'MB',
    combineKey(config, [hostName, 'memory-total']),
    system.availableMB,
    setName('SYSTEM_MEMORY_TOTAL')
  );
  recordMetric(
    this,
    config,
    'bytes',
    'MB',
    combineKey(config, [hostName, 'memory-allocated']),
    system.inUseMB,
    setName('SYSTEM_MEMORY_USED')
  );
  recordMetric(
    this,
    config,
    'bytes',
    'MB',
    combineKey(config, [hostName, 'memory-available']),
    system.freeMB,
    setName('SYSTEM_MEMORY_FREE')
  );
  recordMetric(
    this,
    config,
    'bytes',
    'MB',
    getKey(config, 'physical-allocated'),
    proc.rssMB,
    setName('PROCESS_MEMORY_ALLOCATED')
  );
  recordMetric(
    this,
    config,
    'bytes',
    'MB',
    getKey(config, 'heap-allocated'),
    proc.heapTotalMB,
    setName('PROCESS_MEMORY_AVAILABLE')
  );
  recordMetric(
    this,
    config,
    'bytes',
    'MB',
    getKey(config, 'heap-used'),
    proc.heapUsedMB,
    setName('PROCESS_MEMORY_USED')
  );
  _.each(utilization.loadAverage, (load, core) => {
    recordMetric(
      this,
      config,
      'percentage',
      '%',
      getKey(config, 'core-' + core + '-load'),
      load,
      setName('PROCESS_CORE_' + core + '_LOAD')
    );
  });

  if (interval) {
    if (this.intervalCancelled) {
      this.intervalCancelled = false;
    } else {
      setTimeout(() => {
        this.recordUtilization(interval, metadata);
      }, interval);
    }
  }

  return utilization;
}

function removeAdapters () {
  this.removeAllListeners();
}

function trimString (str) {
  return str.trim();
}

function trim (list) {
  return (list && list.length) ? _.filter(list.map(trimString)) : [];
}

function useAdapter (adapter) {
  if (adapter.setConverter) {
    adapter.setConverter(convert);
  }
  const handle = function (topic, data) {
	  adapter.onMetric(data);
  }
  this.on('metric', handle);
}

function useLocalAdapter () {
  this.use(metrics);
}

function metronic (cfg) {
  const config = _.defaults(cfg || {}, defaults);
  return createApi(config);
}

module.exports = metronic;
