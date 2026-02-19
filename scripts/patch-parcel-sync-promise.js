const fs = require('fs');
const path = require('path');

const syncPromisePath = path.join(
  process.cwd(),
  'node_modules',
  'parcel-bundler',
  'src',
  'utils',
  'syncPromise.js'
);

if (!fs.existsSync(syncPromisePath)) {
  process.exit(0);
}

const replacement = `/**\n * Local patch: avoid native deasync dependency (which fails to build in restricted envs).\n * Parcel v1 only uses this for a deprecated sync getter path.\n */\nfunction syncPromise(promise) {\n  let isDone = false;\n  let res;\n  let err;\n\n  promise.then(\n    value => {\n      res = value;\n      isDone = true;\n    },\n    error => {\n      err = error;\n      isDone = true;\n    }\n  );\n\n  // The synchronous codepath is deprecated in Parcel v1 and should not be hit\n  // in normal builds. If it is, fail with a clear message instead of loading\n  // native deasync bindings that are unavailable in some environments.\n  if (!isDone) {\n    throw new Error('Parcel syncPromise path was invoked; this project patches it to avoid native deasync. Please use async config/package APIs.');\n  }\n\n  if (err) {\n    throw err;\n  }\n\n  return res;\n}\n\nmodule.exports = syncPromise;\n`;

fs.writeFileSync(syncPromisePath, replacement);
console.log('Patched Parcel syncPromise to remove deasync runtime dependency.');
