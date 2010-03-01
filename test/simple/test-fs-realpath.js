process.mixin(require("../common"));

var async_completed = 0;

var dstPath = path.join(fixturesDir, 'cycles', 'root.js');

var linkData1 = "../../cycles/root.js";
var linkPath1 = path.join(fixturesDir, "nested-index", 'one', 'symlink1.js');
try {fs.unlinkSync(linkPath1);}catch(e){}
fs.symlinkSync(linkData1, linkPath1);

var linkData2 = "../one/symlink1.js";
var linkPath2 = path.join(fixturesDir, "nested-index", 'two', 'symlink1-b.js');
try {fs.unlinkSync(linkPath2);}catch(e){}
fs.symlinkSync(linkData2, linkPath2);

assert.equal(fs.realpathSync(linkPath2), dstPath);

fs.realpath(linkPath2, function(err, rpath) {
  if (err) throw err;
  assert.equal(rpath, dstPath);
  async_completed++;
});

process.addListener("exit", function () {
  try {fs.unlinkSync(linkPath1);}catch(e){}
  try {fs.unlinkSync(linkPath2);}catch(e){}
  assert.equal(async_completed, 1);
});
