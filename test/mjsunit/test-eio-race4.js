process.mixin(require("./common"));

var N = 100;
var j = 0;

for (var i = 0; i < N; i++) {
  fs.stat("does-not-exist-" + i, function (e) { // these files don't exist
    if (e) {
      j++; // only makes it to about 17
      puts("finish " + j);
    }
  });
}

process.addListener("exit", function () {
  assert.equal(N, j);
});
