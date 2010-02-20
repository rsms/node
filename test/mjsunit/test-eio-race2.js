process.mixin(require("./common"));
var testTxt = path.join(fixturesDir, "x.txt");
var fs = require('fs');

setTimeout(function () {
  // put this in a timeout, just so it doesn't get bunched up with the
  // require() calls..
  N = 30;
  for (var i=0; i < N; i++) {
    puts("start " + i);
    fs.readFile(testTxt, function(e, data) {
      if (e) {
        puts("error! " + e);
        process.exit(1);
      }
      puts("finish");
    });
  }
}, 100);


