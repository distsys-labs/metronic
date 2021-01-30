const chai = require('chai');
const _ = require('fauxdash');
chai.use(require('chai-as-promised'));
global._ = _;
global.should = chai.should();
global.expect = chai.expect;
global.fs = require('fs');
global.sinon = require('sinon');
const os = require('os');
global.hostName = os.hostname();

chai.Assertion.addMethod('returnError', function (message) {
  let obj = this._obj;
  if (!obj.then) {
    obj = Promise.resolve(obj);
  }
  const self = this;
  return obj.then(function (err) {
    new chai.Assertion(err).to.be.instanceof(Error);
    return self.assert(
      err.message === message,
      "expected error message to be '#{exp}' but got '#{act}'",
      message,
      err.message
    );
  });
});

chai.Assertion.addMethod('partiallyEql', function (partial) {
  let obj = this._obj;
  if (!obj.then) {
    obj = Promise.resolve(obj);
  }
  const self = this;
  return obj.then(function (actual) {
    const diffs = deepCompare(partial, actual);
    return self.assert(
      diffs.length === 0,
      diffs.join('\n\t')
    );
  });
});

function deepCompare (a, b, k) {
  let diffs = [];
  if (b === undefined) {
    diffs.push('expected ' + k + ' to equal ' + a + ' but was undefined ');
  } else if (_.isObject(a) || Array.isArray(a)) {
    _.each(a, function (v, c) {
      const key = k ? [k, c].join('.') : c;
      diffs = diffs.concat(deepCompare(a[c], b[c], key));
    });
  } else {
    const equal = a == b; // jshint ignore:line
    if (!equal) {
      diffs.push('expected ' + k + ' to equal ' + a + ' but got ' + b);
    }
  }
  return diffs;
}
