process.mixin(require("./common"));

var
  count = 100,
  fs = require('fs');

function tryToKillEventLoop() {
  puts('trying to kill event loop ...');

  fs.stat(__filename, function(err) {
    if (err) throw new Exception('first fs.stat failed')
    puts('first fs.stat succeeded ...');
    fs.stat(__filename, function(err) {
      if (err) throw new Exception('second fs.stat failed')
      puts('second fs.stat succeeded ...');
      puts('could not kill event loop, retrying...');
      setTimeout(function () {
        if (--count) {
          tryToKillEventLoop();
        } else {
          process.exit(0);
        }
      }, 1);
    });
  });
}

// Generate a lot of thread pool events
var pos = 0;
fs.open('/dev/zero', "r", function (err, rd) {
  if (err) throw new Exception('could not open '+BIG_FILE);
  function readChunk () {
    fs.read(rd, 1024, pos, 'binary', function (err, chunk, bytesRead) {
      if (err) throw new Exception('could not read from '+BIG_FILE);
      if (chunk) {
        pos += bytesRead;
        //puts(pos);
        readChunk();
      } else {
        fs.close(rd);
        throw new Exception(BIG_FILE+' should not end before the issue shows up');
      }
    });
  }
  readChunk();
});

tryToKillEventLoop();

process.addListener("exit", function () {
  assert.ok(pos > 10000);
});
