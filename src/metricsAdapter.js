const Metrics = require('metrics');
let report = new Metrics.Report();
require('./index');
const convert = require('./converter');

const types = {
  time: 'Timer',
  meter: 'Histogram',
  bytes: 'Histogram',
  percentage: 'Histogram'
};

function createMetric (type, name) {
  let metric = report.getMetric(name);
  if (!metric) {
    metric = new Metrics[type]();
    report.addMetric(name, metric);
  }
  return metric;
}

function getReport (reset) {
  const data = report.summary();
  if (reset) {
    report = new Metrics.Report();
  }
  return data;
}

function recordMetric (data) {
  let value = data.value;
  if (data.type === 'time') {
    value = convert(data.value, data.units, 'ms');
  } else if (data.type === 'bytes') {
    value = convert(data.value, data.units, 'bytes');
  }
  const metric = createMetric(types[data.type], data.key);
  metric.update(value);
}

module.exports = {
  getReport: getReport,
  onMetric: recordMetric
};
