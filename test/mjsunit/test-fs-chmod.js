process.mixin(require("./common"));

var got_error = false;
var success_count = 0;

var __file = path.join(fixturesDir, "a.js");

fs.chmod(__file, 0777, function (err) {
  if (err) return got_error = true;
  puts(fs.stat(__file).mode);
  assert.equal("777", (fs.stat(__file).mode & 0777).toString(8));
  
  fs.chmod(__file, 0644);
  assert.equal("644", (fs.stat(__file).mode & 0777).toString(8));
  success_count++;
});

process.addListener("exit", function () {
  assert.equal(1, success_count);
  assert.equal(false, got_error);
});

