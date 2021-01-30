const os = require('os');
const MB = 1024 * 1024;
const GB = MB * 1024;
const total = os.totalmem();
const TOTALMB = total / MB;
const TOTALGB = total / GB;

function getSystemMetrics () {
  const free = os.freemem();
  const used = total - free;
  const processMemory = process.memoryUsage();
  return {
    systemMemory: {
      availableGB: TOTALGB,
      inUseGB: used / GB,
      freeGB: free / GB,
      availableMB: TOTALMB,
      inUseMB: used / MB,
      freeMB: free / MB
    },
    processMemory: {
      rssGB: processMemory.rss / GB,
      heapTotalGB: processMemory.heapTotal / GB,
      heapUsedGB: processMemory.heapUsed / GB,
      rssMB: processMemory.rss / MB,
      heapTotalMB: processMemory.heapTotal / MB,
      heapUsedMB: processMemory.heapUsed / MB
    },
    loadAverage: os.loadavg()
  };
}

module.exports = getSystemMetrics;
