
// Tests to run, and directories that have contain tests to be run.
// Grow this list as necessary.
var TESTS = ['zone-tests', 'node-tests/simple'];

// Recurse into directories that match this filter.
var DIR_FILTER = /^[^.].*$/;

// Only test the files that match this filter.
var FILE_FILTER = /^[^._].*\.*js$/;


var cwd = process.cwd();
var dirname = require('path').dirname;
var fs = require('fs');
var relative = require('path').relative;
var resolve = require('path').resolve;
var execFile = require('child_process').execFile;

var successes = 0;
var failures = 0;

if (process.env.TAP) {
  console.log('TAP version 13');
}

testAll(function() {
  console.error('%d failed, %d passed', failures, successes);
  if (process.env.TAP) {
    console.log('\n1..%d', successes + failures);
    console.log('# tests %d', successes + failures);
    console.log('# pass %d', successes);
    if (failures > 0) {
      console.log('# fail %d', failures);
    }
  }
});

function testAll(cb) {
  // Test all the things specified in the TESTS list.
  var i = 0;
  testNext();

  function testNext() {
    // If there are no more tests to be run, call the callback.
    if (i >= TESTS.length)
      return cb();

    var name = TESTS[i++];
    testAny(__dirname, name, testNext);
  }
}


function testAny(dir, name, cb) {
  // Find the full path of the file if necessary.
  var path = resolve(dir, name);

  if (FILE_FILTER.test(name) && fs.statSync(path).isFile())
    testFile(path, cb);
  else if (DIR_FILTER.test(name) && fs.statSync(path).isDirectory())
    testDir(path, cb);
  else
    cb();
}


function testDir(path, cb) {
  // Read all the files in this directory.
  var names = fs.readdirSync(path);

  var i = 0;
  testNext();

  function testNext() {
    // If there are no more tests to be run, call the callback.
    if (i >= names.length)
      return cb();

    var name = names[i++];

    // Test all files that match the either filter.
    testAny(path, name, testNext);
  }
}


function testFile(path, cb) {
  var name = relative(cwd, path);

  var node = process.execPath;
  var argv = process.execArgv.concat([path]);
  var options = { cwd: dirname(path),
                  encoding: 'utf8' };

  execFile(node, argv, options, onExit);

  function onExit(err, stdout, stderr) {
    if (!err) {
      console.error('pass: %s',
                    name);
      successes++;
      if (process.env.TAP) {
        console.log('ok %d - %s', successes + failures, name);
      }

    } else {
      var output = stderr || stdout;
      output = output.replace(/^[\s\r\n]*[\r\n]/, '');
      output = output.replace(/[\s\r\n]*$/, '\n');

      console.error('\x1b[30;41mfail: %s\x1b[0m\n' +
                    '\x1b[31m%s\x1b[0m',
                    name,
                    output);
      failures++;
      if (process.env.TAP) {
        console.log('not ok %d - %s', successes + failures, name);
        console.log('# %s', output.replace(/\n/g, '\n#'));
      }
    }

    cb();
  }
}
