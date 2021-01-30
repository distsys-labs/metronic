const _ = require('fauxdash');
const timeLookup = [1, 1000, 1000000, 1000000000];
const timeUnits = ['NS', 'US', 'MS', 'S'];

const byteLookup = [1, 1024, 1048576, 1073741824, 1099511627776];
const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

function convertTime (value, sourceUnits, destinationUnits) {
  const sourceIndex = timeUnits.indexOf(sourceUnits);
  const destinationIndex = timeUnits.indexOf(destinationUnits);
  const index = Math.abs(sourceIndex - destinationIndex);
  const factor = timeLookup[index];
  return sourceIndex > destinationIndex ? value * factor : value / factor;
}

function convertBytes (value, sourceUnits, destinationUnits) {
  const sourceIndex = byteUnits.indexOf(sourceUnits);
  const destinationIndex = byteUnits.indexOf(destinationUnits);
  const index = Math.abs(sourceIndex - destinationIndex);
  const factor = byteLookup[index];
  return sourceIndex > destinationIndex ? value * factor : value / factor;
}

function convert (value, sourceUnits, destinationUnits) {
  sourceUnits = sourceUnits.toUpperCase();
  destinationUnits = destinationUnits.toUpperCase();
  if (timeUnits.includes(sourceUnits)) {
    return convertTime(value, sourceUnits, destinationUnits);
  } else if (byteUnits.includes(sourceUnits)) {
    return convertBytes(value, sourceUnits, destinationUnits);
  } else {
    throw new Error('Metronic converter only supports conversion between time or byte measurements');
  }
}

module.exports = convert;
