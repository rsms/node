process.mixin(require("../common"));

var dirname = path.dirname(__filename);
var fixtures = path.join(dirname, "../fixtures");
var dbase = path.join(fixtures, "mkdirs");
var d = path.join(dbase, "foo/bar/deep");
var mkdirs_error = false;

function rmrf(fn, cb) {
  return exec("rm -rf '"+fn.replace("'","\\'")+"'", function(err){
    if (err) puts("rm -rf error: " + err.message);
    cb(err);
  });
}

function testAsync() {
  fs.mkdirs(d, function (err) {
    if (err) {
      puts("mkdirs error: " + err.message);
      mkdir_errors = err;
    } else {
      rmrf(dbase, function(err) {
        if (err) rmdir_error = err;
      });
    }
  });
}

function testSync() {
  fs.mkdirsSync(d);
}

// rm -rf dbase
rmrf(dbase, function(err) {
// mkdir -p d
  testSync();
  // rm -rf dbase
  rmrf(dbase, function(err) {
    // mkdir -p d & # implies rm -rf dbase
    testAsync();
  });
});

process.addListener("exit", function () {
  assert.equal(mkdirs_error, false);
  puts("fs.mkdirs test OK");
});
