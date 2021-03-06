// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

require('../../').enable(); // Enable zones.

var path = require('path');
var fs = require('fs');
var assert = require('assert');

exports.testDir = path.dirname(__filename);
exports.fixturesDir = path.join(exports.testDir, 'fixtures');
exports.libDir = path.join(exports.testDir, '../lib');
exports.tmpDir = path.join(exports.testDir, 'tmp');
exports.PORT = +process.env.NODE_COMMON_PORT || 12346;

if (process.platform === 'win32') {
  exports.PIPE = '\\\\.\\pipe\\libuv-test';
  exports.opensslCli = path.join(process.execPath, '..', 'openssl-cli.exe');
} else {
  exports.PIPE = exports.tmpDir + '/test.sock';
  exports.opensslCli = path.join(process.execPath, '..', 'openssl-cli');
}
if (!fs.existsSync(exports.opensslCli))
  exports.opensslCli = false;

if (process.platform === 'win32') {
  exports.faketimeCli = false;
} else {
  exports.faketimeCli = path.join(__dirname, "..", "tools", "faketime", "src",
    "faketime");
}

var util = require('util');
for (var i in util) exports[i] = util[i];
//for (var i in exports) global[i] = exports[i];

function protoCtrChain(o) {
  var result = [];
  for (; o; o = o.__proto__) { result.push(o.constructor); }
  return result.join();
}

exports.indirectInstanceOf = function(obj, cls) {
  if (obj instanceof cls) { return true; }
  var clsChain = protoCtrChain(cls.prototype);
  var objChain = protoCtrChain(obj);
  return objChain.slice(-clsChain.length) === clsChain;
};


exports.ddCommand = function(filename, kilobytes) {
  if (process.platform === 'win32') {
    var p = path.resolve(exports.fixturesDir, 'create-file.js');
    return '"' + process.argv[0] + '" "' + p + '" "' +
           filename + '" ' + (kilobytes * 1024);
  } else {
    return 'dd if=/dev/zero of="' + filename + '" bs=1024 count=' + kilobytes;
  }
};


exports.spawnCat = function(options) {
  var spawn = require('child_process').spawn;

  if (process.platform === 'win32') {
    return spawn('more', [], options);
  } else {
    return spawn('cat', [], options);
  }
};


exports.spawnPwd = function(options) {
  var spawn = require('child_process').spawn;

  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/c', 'cd'], options);
  } else {
    return spawn('pwd', [], options);
  }
};


var mustCallChecks = [];


function runCallChecks(exitCode) {
  if (exitCode !== 0) return;

  var failed = mustCallChecks.filter(function(context) {
    return context.actual !== context.expected;
  });

  failed.forEach(function(context) {
    console.log('Mismatched %s function calls. Expected %d, actual %d.',
                context.name,
                context.expected,
                context.actual);
    console.log(context.stack.split('\n').slice(2).join('\n'));
  });

  if (failed.length) process.exit(1);
}


exports.mustCall = function(fn, expected) {
  if (typeof expected !== 'number') expected = 1;

  var context = {
    expected: expected,
    actual: 0,
    stack: (new Error).stack,
    name: fn.name || '<anonymous>'
  };

  // add the exit listener only once to avoid listener leak warnings
  if (mustCallChecks.length === 0) process.on('exit', runCallChecks);

  mustCallChecks.push(context);

  return function() {
    context.actual++;
    return fn.apply(this, arguments);
  };
};

exports.hasMultiLocalhost = function hasMultiLocalhost() {
  var TCP = process.binding('tcp_wrap').TCP;
  var t = new TCP();
  var ret = t.bind('127.0.0.2', exports.PORT);
  t.close();
  return ret === 0;
};
