// logger.js
const reset = '\x1b[0m';
const colors = {
  info: '\x1b[36m',    // cyan
  success: '\x1b[32m', // green
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[90m',   // gray
  timestamp: '\x1b[90m',
};

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function format(type, message, ...args) {
  const ts = `${colors.timestamp}[${getTimestamp()}]${reset}`;
  const label = `${colors[type]}${type.toUpperCase().padEnd(7)}${reset}`;
  const msg = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
  return `${ts} ${label} ${msg} ${args.length ? JSON.stringify(args) : ''}`;
}

module.exports = {
  info: (msg, ...args) => console.log(format('info', msg, ...args)),
  success: (msg, ...args) => console.log(format('success', msg, ...args)),
  warn: (msg, ...args) => console.warn(format('warn', msg, ...args)),
  error: (msg, ...args) => console.error(format('error', msg, ...args)),
  debug: (msg, ...args) => console.debug(format('debug', msg, ...args)),
};