process.mixin(require("./common"));

var fn = path.join(fixturesDir, "write.txt");
var expected = "hello";
var found;

fs.open(fn, 'w', 0644, function(err, fd) {
  if (err) throw err;
  fs.write(fd, expected, 0, "utf8", function(err) {
    if (err) throw err;
    fs.close(fd, function(err) {
      if (err) throw err;
      fs.readFile(fn, process.UTF8, function(err, contents) {
        if (err) throw err;
        found = contents;
        fs.unlinkSync(fn);
      });
    });
  });
});

process.addListener("exit", function () {
  assert.equal(expected, found);
});

