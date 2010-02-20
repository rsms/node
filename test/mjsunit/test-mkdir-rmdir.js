process.mixin(require("./common"));

var dirname = path.dirname(__filename);
var fixtures = path.join(dirname, "fixtures");
var d = path.join(fixtures, "dir");

var mkdir_error = false;
var rmdir_error = false;

// make sure the dir does not exist
try { fs.rmdir(d); } catch(e){}

fs.mkdir(d, 0x666, function (e) {
  if (e) {
    puts("mkdir error: " + e.message);
    return mkdir_error = e;
  }
  puts("mkdir okay!");
  fs.rmdir(d, function (e) {
    if (e) {
      puts("rmdir error: " + e.message);
      return rmdir_error = e;
    }
    puts("rmdir okay!");
  });
});

process.addListener("exit", function () {
  assert.equal(false, mkdir_error);
  assert.equal(false, rmdir_error);
  puts("exit");
});
