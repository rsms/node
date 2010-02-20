(function (process) {

process.global.process = process;
process.global.global = process.global;
global.GLOBAL = global;
Function.EMPTY = function(){};

/** deprecation errors ************************************************/

function removed (reason) {
  return function () {
    throw new Error(reason)
  }
}

GLOBAL.__module = removed("'__module' has been renamed to 'module'");
GLOBAL.include = removed("include(module) has been removed. Use process.mixin(GLOBAL, require(module)) to get the same effect.");
GLOBAL.puts = removed("puts() has moved. Use require('sys') to bring it back.");
GLOBAL.print = removed("print() has moved. Use require('sys') to bring it back.");
GLOBAL.p = removed("p() has moved. Use require('sys') to bring it back.");
process.debug = removed("process.debug() has moved. Use require('sys') to bring it back.");
process.error = removed("process.error() has moved. Use require('sys') to bring it back.");

GLOBAL.node = {};

node.createProcess = removed("node.createProcess() has been changed to process.createChildProcess() update your code");
node.exec = removed("process.exec() has moved. Use require('sys') to bring it back.");
node.inherits = removed("node.inherits() has moved. Use require('sys') to access it.");

node.http = {};
node.http.createServer = removed("node.http.createServer() has moved. Use require('http') to access it.");
node.http.createClient = removed("node.http.createClient() has moved. Use require('http') to access it.");

node.tcp = {};
node.tcp.createServer = removed("node.tcp.createServer() has moved. Use require('tcp') to access it.");
node.tcp.createConnection = removed("node.tcp.createConnection() has moved. Use require('tcp') to access it.");

node.dns = {};
node.dns.createConnection = removed("node.dns.createConnection() has moved. Use require('dns') to access it.");

/**********************************************************************/

// Module 

var internalModuleCache = {};

function Module (id, parent) {
  this.id = id;
  this.exports = {};
  this.parent = parent;

  if (parent) {
    this.moduleCache = parent.moduleCache;
  } else {
    this.moduleCache = {};
  }
  this.moduleCache[this.id] = this;

  this.filename = null;
  this.loaded = false;
  this.loadCallback = null;
  this.exited = false;
  this.children = [];
};

function createInternalModule (id, constructor) {
  var m = new Module(id);
  constructor(m.exports);
  m.loaded = true;
  internalModuleCache[id] = m;
  return m;
};


process.inherits = function (ctor, superCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = superCtor.prototype;
  ctor.super_ = superCtor;
  ctor.prototype = new tempCtor();
  ctor.prototype.constructor = ctor;
};


process.createChildProcess = function (file, args, env) {
  var child = new process.ChildProcess();
  args = args || [];
  env = env || process.env;
  var envPairs = [];
  for (var key in env) {
    if (env.hasOwnProperty(key)) {
      envPairs.push(key + "=" + env[key]);
    }
  }
  // TODO Note envPairs is not currently used in child_process.cc. The PATH
  // needs to be searched for the 'file' command if 'file' does not contain
  // a '/' character.
  child.spawn(file, args, envPairs);
  return child;
};

process.assert = function (x, msg) {
  if (!(x)) throw new Error(msg || "assertion error");
};

// From jQuery.extend in the jQuery JavaScript Library v1.3.2
// Copyright (c) 2009 John Resig
// Dual licensed under the MIT and GPL licenses.
// http://docs.jquery.com/License
// Modified for node.js (formely for copying properties correctly)
process.mixin = function() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, source;

  // Handle a deep copy situation
  if ( typeof target === "boolean" ) {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if ( typeof target !== "object" && !(typeof target === 'function') )
    target = {};

  // mixin process itself if only one argument is passed
  if ( length == i ) {
    target = GLOBAL;
    --i;
  }

  for ( ; i < length; i++ ) {
    // Only deal with non-null/undefined values
    if ( (source = arguments[i]) != null ) {
      // Extend the base object
      Object.getOwnPropertyNames(source).forEach(function(k){
        var d = Object.getOwnPropertyDescriptor(source, k);
        if (d.get) {
          target.__defineGetter__(k, d.get);
          if (d.set)
            target.__defineSetter__(k, d.set);
        }
        else {
          // Prevent never-ending loop
          if (target === d.value)
            continue;
          
          if (deep && d.value && typeof d.value === "object") {
            target[k] = process.mixin(deep,
              // Never move original objects, clone them
              source || (d.value.length != null ? [] : {})
            , d.value);
          }
          else {
            target[k] = d.value;
          }
        }
      });
    }
  }
  // Return the modified object
  return target;
};

// Event

var eventsModule = createInternalModule('events', function (exports) {
  exports.EventEmitter = process.EventEmitter;

  // process.EventEmitter is defined in src/events.cc
  // process.EventEmitter.prototype.emit() is also defined there.
  process.EventEmitter.prototype.addListener = function (type, listener) {
    if (listener instanceof Function) {
      if (!this._events) this._events = {};
      if (!this._events.hasOwnProperty(type)) this._events[type] = [];
      // To avoid recursion in the case that type == "newListeners"! Before
      // adding it to the listeners, first emit "newListeners".
      this.emit("newListener", type, listener);
      this._events[type].push(listener);
    }
    return this;
  };

  process.EventEmitter.prototype.removeListener = function (type, listener) {
    if (listener instanceof Function) {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events || !this._events.hasOwnProperty(type)) return;
      var list = this._events[type];
      if (list.indexOf(listener) < 0) return;
      list.splice(list.indexOf(listener), 1);
    }
    return this;
  };

  process.EventEmitter.prototype.listeners = function (type) {
    if (!this._events) this._events = {};
    if (!this._events.hasOwnProperty(type)) this._events[type] = [];
    return this._events[type];
  };

  exports.Promise = function () {
    exports.EventEmitter.call(this);
    this._blocking = false;
    this.hasFired = false;
    this._values = undefined;
  };
  process.inherits(exports.Promise, exports.EventEmitter);

  process.Promise = exports.Promise;

  exports.Promise.prototype.timeout = function(timeout) {
    if (!timeout) {
      return this._timeoutDuration;
    }
    
    this._timeoutDuration = timeout;
    
    if (this.hasFired) return;
    this._clearTimeout();

    var self = this;
    this._timer = setTimeout(function() {
      self._timer = null;
      if (self.hasFired) {
        return;
      }

      self.emitError(new Error('timeout'));
    }, timeout);

    return this;
  };
  
  exports.Promise.prototype._clearTimeout = function() {
    if (!this._timer) return;
    
    clearTimeout(this._timer);
    this._timer = null;
  }

  exports.Promise.prototype.emitSuccess = function() {
    if (this.hasFired) return;
    this.hasFired = 'success';
    this._clearTimeout();

    this._values = Array.prototype.slice.call(arguments);
    this.emit.apply(this, ['success'].concat(this._values));
  };

  exports.Promise.prototype.emitError = function() {
    if (this.hasFired) return;
    this.hasFired = 'error';
    this._clearTimeout();

    this._values = Array.prototype.slice.call(arguments);
    this.emit.apply(this, ['error'].concat(this._values));

    if (this.listeners('error').length == 0) {
      var self = this;
      process.nextTick(function() {
        if (self.listeners('error').length == 0) {
          throw (self._values[0] instanceof Error)
            ? self._values[0]
            : new Error('Unhandled emitError: '+JSON.stringify(self._values));
        }
      });
    }
  };

  exports.Promise.prototype.addCallback = function (listener) {
    if (this.hasFired === 'success') {
      listener.apply(this, this._values);
    }

    return this.addListener("success", listener);
  };

  exports.Promise.prototype.addErrback = function (listener) {
    if (this.hasFired === 'error') {
      listener.apply(this, this._values);
    }

    return this.addListener("error", listener);
  };
});

var events = eventsModule.exports;


// nextTick()

var nextTickQueue = [];
var nextTickWatcher = new process.IdleWatcher();
// Only debugger has maximum priority. Below that is the nextTickWatcher.
nextTickWatcher.setPriority(process.EVMAXPRI-1);

nextTickWatcher.callback = function () {
  var l = nextTickQueue.length;
  while (l--) {
    var cb = nextTickQueue.shift();
    cb();
  }
  if (nextTickQueue.length == 0) nextTickWatcher.stop();
};

process.nextTick = function (callback) {
  nextTickQueue.push(callback);
  nextTickWatcher.start();
};





// Signal Handlers

function isSignal (event) {
  return event.slice(0, 3) === 'SIG' && process.hasOwnProperty(event);
};

process.addListener("newListener", function (event) {
  if (isSignal(event) && process.listeners(event).length === 0) {
    var handler = new process.SignalHandler(process[event]);
    handler.addListener("signal", function () {
      process.emit(event);
    });
  }
});


// Stat Change Watchers

var statWatchers = {};

process.watchFile = function (filename) {
  var stat;
  var options;
  var listener;

  if ("object" == typeof arguments[1]) {
    options = arguments[1];
    listener = arguments[2];
  } else {
    options = {};
    listener = arguments[1];
  }

  if (options.persistent === undefined) options.persistent = true;
  if (options.interval === undefined) options.interval = 0;

  if (filename in statWatchers) {
    stat = statWatchers[filename];
  } else {
    statWatchers[filename] = new process.Stat();
    stat = statWatchers[filename];
    stat.start(filename, options.persistent, options.interval);
  }
  stat.addListener("change", listener);
  return stat;
};

process.unwatchFile = function (filename) {
  if (filename in statWatchers) {
    stat = statWatchers[filename];
    stat.stop();
    statWatchers[filename] = undefined;
  }
};

process.Stats.prototype._checkModeProperty = function (property) {
  return ((this.mode & property) === property);
};

process.Stats.prototype.isDirectory = function () {
  return this._checkModeProperty(process.S_IFDIR);
};

process.Stats.prototype.isFile = function () {
  return this._checkModeProperty(process.S_IFREG);
};

process.Stats.prototype.isBlockDevice = function () {
  return this._checkModeProperty(process.S_IFBLK);
};

process.Stats.prototype.isCharacterDevice = function () {
  return this._checkModeProperty(process.S_IFCHR);
};

process.Stats.prototype.isSymbolicLink = function () {
  return this._checkModeProperty(process.S_IFLNK);
};

process.Stats.prototype.isFIFO = function () {
  return this._checkModeProperty(process.S_IFIFO);
};

process.Stats.prototype.isSocket = function () {
  return this._checkModeProperty(process.S_IFSOCK);
};



// Timers
function addTimerListener (callback) {
  var timer = this;
  // Special case the no param case to avoid the extra object creation.
  if (arguments.length > 2) {
    var args = Array.prototype.slice.call(arguments, 2);
    timer.addListener("timeout", function(){
      callback.apply(timer, args);
    });
  } else {
    timer.addListener("timeout", callback);
  }
}

GLOBAL.setTimeout = function (callback, after) {
  var timer = new process.Timer();
  addTimerListener.apply(timer, arguments);
  timer.start(after, 0);
  return timer;
};

GLOBAL.setInterval = function (callback, repeat) {
  var timer = new process.Timer();
  addTimerListener.apply(timer, arguments);
  timer.start(repeat, repeat);
  return timer;
};

GLOBAL.clearTimeout = function (timer) {
  if (timer instanceof process.Timer) {
    timer.stop();
  }
};

GLOBAL.clearInterval = GLOBAL.clearTimeout;




// Modules

var debugLevel = 0;
if ("NODE_DEBUG" in process.env) debugLevel = 1;

function debug (x) {
  if (debugLevel > 0) {
    process.stdio.writeError(x + "\n");
  }
}



var fsModule = createInternalModule("fs", function (exports) {
  exports.Stats = process.Stats;
  
  function deprecated(name, useinstead) {
    return function() {
      if (!name)
        name = arguments.callee.name || '<anonymous>';
      if (!useinstead && name.substr(name.length-4) === 'Sync')
        useinstead = name.substr(0, name.length-4);
      throw new Error(name+" is deprecated"+
        (useinstead ? ". Please use "+useinstead+" instead." : ""));
    }
  }
  
  // Used by fs.open and friends
  function stringToFlags(flag) {
    // Only mess with strings
    if (typeof flag !== 'string') {
      return flag;
    }
    switch (flag) {
      case "r": return process.O_RDONLY;
      case "r+": return process.O_RDWR;
      case "w": return process.O_CREAT | process.O_TRUNC | process.O_WRONLY;
      case "w+": return process.O_CREAT | process.O_TRUNC | process.O_RDWR;
      case "a": return process.O_APPEND | process.O_CREAT | process.O_WRONLY; 
      case "a+": return process.O_APPEND | process.O_CREAT | process.O_RDWR;
      default: throw new Error("Unknown file open flag: " + flag);
    }
  }

  // Yes, the follow could be easily DRYed up but I provide the explicit
  // list to make the arguments clear.

  // close(fd, [callback])
  exports.close = function (fd, callback) {
    return process.fs.close(fd, callback);
  };

  exports.closeSync = deprecated('fs.closeSync');

  // open(path, [flags=O_RDONLY, [mode=0666]], [callback])
  exports.open = function (path, flags, mode, callback) {
    if (typeof flags === 'function') {
      callback = flags;
      flags = undefined;
    }
    else if (typeof mode === 'function') {
      callback = mode;
      mode = undefined;
    }
    flags = (flags === undefined) ? process.O_RDONLY : stringToFlags(flags);
    if (mode === undefined) mode = 0666;
    return process.fs.open(path, flags, mode, callback);
  };

  exports.openSync = deprecated('fs.openSync');

  // read(fd, length, [position, [encoding='binary']], [callback])
  exports.read = function (fd, length, position, encoding, callback) {
    if (typeof position === 'function') {
      callback = position;
      position = undefined;
    }
    else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    return process.fs.read(fd, length, position, encoding||'binary', callback);
  };

  exports.readSync = deprecated('fs.readSync');

  // write(fd, data, [position, [encoding='binary']], [callback])
  exports.write = function (fd, data, position, encoding, callback) {
    if (typeof position === 'function') {
      callback = position;
      position = undefined;
    }
    else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    return process.fs.write(fd, data, position, encoding||'binary', callback);
  };

  exports.writeSync = deprecated('fs.writeSync');

  // rename(oldPath, newPath, [callback])
  exports.rename = function (oldPath, newPath, callback) {
    return process.fs.rename(oldPath, newPath, callback);
  };

  exports.renameSync = deprecated('fs.renameSync');

  // truncate(fd, len, [callback])
  exports.truncate = function (fd, len, callback) {
    return process.fs.truncate(fd, len, callback);
  };

  exports.truncateSync = deprecated('fs.truncateSync');

  exports.rmdir = function (path, callback) {
    return process.fs.rmdir(path, callback);
  };

  exports.rmdirSync = deprecated('fs.rmdirSync');

  // truncate(fd, [mode=(0777^umask)], [callback])
  exports.mkdir = function (path, mode, callback) {
    if (typeof mode === 'function') {
      callback = mode;
      mode = undefined;
    }
    if (mode === undefined)
      mode = 0777 ^ process.umask();
    return process.fs.mkdir(path, mode, callback);
  };

  exports.mkdirSync = deprecated('fs.mkdirSync');

  // truncate(outFd, inFd, inOffset, length, [callback])
  exports.sendfile = function (outFd, inFd, inOffset, length, callback) {
    return process.fs.sendfile(outFd, inFd, inOffset, length, callback);
  };

  exports.sendfileSync = deprecated('fs.sendfileSync');

  exports.readdir = function (path, callback) {
    return process.fs.readdir(path, callback);
  };

  exports.readdirSync = deprecated('fs.readdirSync');

  exports.stat = function (path, callback) {
    return process.fs.stat(path, callback);
  };

  exports.statSync = deprecated('fs.statSync');

  exports.unlink = function (path, callback) {
    return process.fs.unlink(path, callback);
  };

  exports.unlinkSync = deprecated('fs.unlinkSync');

  // writeFile(path, data, [encoding='utf8'], [callback])
  exports.writeFile = function (path, data, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    if (!callback)
      return fs._writeFileSync(path, data, encoding);
    return fs.open(path, "w", function (err, fd) {
      if (err) return callback(err);
      function doWrite (_data) {
        fs.write(fd, _data, 0, encoding||"utf8", function (err, written) {
          if (err) {
            exports.close(fd, function(){ callback(err); });
          }
          else if (written === _data.length) {
            // todo: return number of bytes written?
            exports.close(fd, callback);
          }
          else {
            doWrite(_data.slice(written));
          }
        });
      }
      doWrite(data);
    });
  };
  
  exports.writeFileSync = deprecated('fs.writeFileSync');
  exports._writeFileSync = function (path, data, encoding) {
    var fd = exports.open(path, "w");
    var r = process.fs.write(fd, data, 0, encoding||'utf8');
    exports.close(fd);
    return r;
  };
  
  
  exports.cat = deprecated('fs.cat', 'fs.readFile');
  exports.catSync = deprecated('fs.catSync', 'fs.readFile');

  exports.readFile = function (path, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    if (!callback)
      return exports._readFileSync(path, encoding);
    encoding = encoding || "utf8"; // default to utf8
    exports.open(path, "r", function (err, fd) {
      if (err)
        return callback(err);
      var content = "", pos = 0;
      function readChunk () {
        exports.read(fd, 16*1024, pos, encoding, function (err, chunk, bytes_read) {
          if (err)
            return callback(err);
          if (chunk) {
            if (chunk.constructor === String) {
              content += chunk;
            } else {
              content = content.concat(chunk);
            }
            pos += bytes_read;
            readChunk();
          } else {
            return exports.close(fd, function(err){ callback(err, content); });
          }
        });
      }
      readChunk();
    });
  };

  exports.readFileSync = deprecated('fs.readFileSync');
  exports._readFileSync = function (path, encoding) {
    var
      fd = exports.open(path, "r"),
      content = '',
      pos = 0,
      r;

    while ((r = exports.read(fd, 16*1024, pos, encoding)) && r[0]) {
      content += r[0];
      pos += r[1]
    }

    return content;
  };

  exports.chmod = function(path, mode, callback){
    return process.fs.chmod(path, mode, callback);
  };
  
  exports.chmodSync = deprecated('fs.chmodSync');
  
});

var fs = fsModule.exports;


var pathModule = createInternalModule("path", function (exports) {
  exports.join = function () {
    return exports.normalize(Array.prototype.join.call(arguments, "/"));
  };

  exports.normalizeArray = function (parts, keepBlanks) {
    var directories = [], prev;
    for (var i = 0, l = parts.length - 1; i <= l; i++) {
      var directory = parts[i];

      // if it's blank, but it's not the first thing, and not the last thing, skip it.
      if (directory === "" && i !== 0 && i !== l && !keepBlanks) continue;

      // if it's a dot, and there was some previous dir already, then skip it.
      if (directory === "." && prev !== undefined) continue;

      if (
        directory === ".."
        && directories.length
        && prev !== ".."
        && prev !== undefined
        && (prev !== "" || keepBlanks)
      ) {
        directories.pop();
        prev = directories.slice(-1)[0]
      } else {
        if (prev === ".") directories.pop();
        directories.push(directory);
        prev = directory;
      }
    }
    return directories;
  };

  exports.normalize = function (path, keepBlanks) {
    return exports.normalizeArray(path.split("/"), keepBlanks).join("/");
  };

  exports.dirname = function (path) {
    return path.substr(0, path.lastIndexOf("/")) || ".";
  };

  exports.filename = function () {
    throw new Error("path.filename is deprecated. Please use path.basename instead.");
  };
  exports.basename = function (path, ext) {
    var f = path.substr(path.lastIndexOf("/") + 1);
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  };

  exports.extname = function (path) {
    var index = path.lastIndexOf('.');
    return index < 0 ? '' : path.substring(index);
  };

  // exists(path, [callback])
  exports.exists = function (path, callback) {
    if (callback) {
      fs.stat(path, function(err){ callback(err ? false : true); });
    }
    else {
      return fs.stat(path) ? true : false;
    }
  };
});

var path = pathModule.exports;

function existsSync (path) {
  try {
    fs.stat(path);
    return true;
  } catch (e) {
    return false;
  }
}



process.paths = [ path.join(process.installPrefix, "lib/node/libraries")
               ];

if (process.env["HOME"]) {
  process.paths.unshift(path.join(process.env["HOME"], ".node_libraries"));
}

if (process.env["NODE_PATH"]) {
  process.paths = process.env["NODE_PATH"].split(":").concat(process.paths);
}

/* Sync unless callback given */
function findModulePath (id, dirs, callback) {
  process.assert(dirs.constructor == Array);

  if (/^https?:\/\//.exec(id)) {
    if (callback) {
      callback(id);
    } else {
      throw new Error("Sync http require not allowed.");
    }
    return;
  }

  if (/\.(js|node)$/.exec(id)) {
    throw new Error("No longer accepting filename extension in module names");
  }

  if (dirs.length == 0) {
    if (callback) {
      callback();
    } else {
      return; // sync returns null
    }
  }

  var dir = dirs[0];
  var rest = dirs.slice(1, dirs.length);

  if (id.charAt(0) == '/') {
    dir = '';
    rest = [];
  }

  var locations = [
    path.join(dir, id + ".js"),
    path.join(dir, id + ".node"),
    path.join(dir, id, "index.js"),
    path.join(dir, id, "index.addon")
  ];

  function searchLocations () {
    var location = locations.shift();
    if (!location) {
      return findModulePath(id, rest, callback);
    }

    // if async
    if (callback) {
      path.exists(location, function (found) {
        if (found) {
          callback(location);
        } else {
          return searchLocations();
        }
      })

    // if sync
    } else {
      if (existsSync(location)) {
        return location;
      } else {
        return searchLocations();
      }
    }
  }
  return searchLocations();
}


// sync - no i/o performed
function resolveModulePath(request, parent) {
  var id, paths;
  if (request.charAt(0) == "." && (request.charAt(1) == "/" || request.charAt(1) == ".")) {
    // Relative request
    var parentIdPath = path.dirname(parent.id +
      (path.basename(parent.filename).match(/^index\.(js|addon)$/) ? "/" : ""));
    id = path.join(parentIdPath, request);
    // debug("RELATIVE: requested:"+request+" set ID to: "+id+" from "+parent.id+"("+parentIdPath+")");
    paths = [path.dirname(parent.filename)];
  } else {
    id = request;
    // debug("ABSOLUTE: id="+id);
    paths = process.paths;
  }

  return [id, paths];
}


function loadModuleSync (request, parent) {
  var resolvedModule = resolveModulePath(request, parent);
  var id = resolvedModule[0];
  var paths = resolvedModule[1];

  if (debugLevel > 0)
    debug("loadModuleSync REQUEST  " + (request) + " parent: " + parent.id);

  var cachedModule = internalModuleCache[id] || parent.moduleCache[id];

  if (cachedModule) {
    if (debugLevel > 0)
      debug("found  " + JSON.stringify(id) + " in cache");
    return cachedModule.exports;
  } else {
    if (debugLevel > 0)
      debug("looking for " + JSON.stringify(id) + " in " + 
            JSON.stringify(paths));
    var filename = findModulePath(request, paths);
    if (!filename) {
      throw new Error("Cannot find module '" + request + "'");
    } else {
      var module = new Module(id, parent);
      module.loadSync(filename);
      return module.exports;
    }
  }
}


function loadModule (request, parent, callback) {
  if (!callback)
    return loadModuleSync(request, parent);
  var
    resolvedModule = resolveModulePath(request, parent),
    id = resolvedModule[0],
    paths = resolvedModule[1];

  if (debugLevel > 0)
    debug("loadModule REQUEST  " + (request) + " parent: " + parent.id);

  var cachedModule = internalModuleCache[id] || parent.moduleCache[id];
  if (cachedModule) {
    if (debugLevel > 0)
      debug("found  " + JSON.stringify(id) + " in cache");
    process.nextTick(function() {
      callback(null, cachedModule.exports);
    });
  }
  else {
    if (debugLevel > 0)
      debug("looking for " + JSON.stringify(id) + " in " + 
            JSON.stringify(paths));
    // Not in cache
    findModulePath(request, paths, function (filename) {
      if (!filename) {
        callback(new Error("Cannot find module '" + request + "'"));
      } else {
        (new Module(id, parent)).load(filename, callback);
      }
    });
  }
};


Module.prototype.loadSync = function (filename) {
  if (debugLevel > 0)
    debug("loadSync " + JSON.stringify(filename) + " for module " +
          JSON.stringify(this.id));

  process.assert(!this.loaded);
  this.filename = filename;

  if (filename.match(/\.node$/)) {
    this._loadObjectSync(filename);
  } else {
    this._loadScriptSync(filename);
  }
};


Module.prototype.load = function (filename, callback) {
  if (debugLevel > 0)
    debug("load " + JSON.stringify(filename) + " for module " +
          JSON.stringify(this.id));

  process.assert(!this.loaded);
  process.assert(!this.loadCallback);

  this.loadCallback = callback;
  this.filename = filename;

  if (filename.match(/\.node$/)) {
    this._loadObject(filename, callback);
  } else {
    this._loadScript(filename, callback);
  }
};


Module.prototype._loadObjectSync = function (filename) {
  this.loaded = true;
  process.dlopen(filename, this.exports);
};


Module.prototype._loadObject = function (filename, callback) {
  var self = this;
  // XXX Not yet supporting loading from HTTP. would need to download the
  // file, store it to tmp then run dlopen on it.
  process.nextTick(function () {
    self.loaded = true;
    process.dlopen(filename, self.exports); // FIXME synchronus
    callback(null, self.exports);
  });
};


function cat (id, loadCallback, callback) {
  if (id.match(/^http:\/\//)) {
    loadModule('http', process.mainModule, function(err, http) {
      if (err)
        loadCallback(new Error("could not load core module \"http\""));
      else
        http.cat(id, callback);
    })
  }
  else {
    fs.readFile(id, callback);
  }
}


Module.prototype._loadContent = function (content, filename) {
  var self = this;
  // remove shebang
  content = content.replace(/^\#\!.*/, '');

  function requireAsync (url) {
    return loadModule(url, self); // new child
  }

  function require (path) {
    return loadModuleSync(path, self);
  }

  require.paths = process.paths;
  require.async = requireAsync;
  require.main = process.mainModule;
  // create wrapper function
  var wrapper = "(function (exports, require, module, __filename, __dirname) { "
              + content
              + "\n});";

  try {
    var compiledWrapper = process.compile(wrapper, filename);
    compiledWrapper.apply(self.exports, [self.exports, require, self, filename, path.dirname(filename)]);
  } catch (e) {
    return e;
  }
};


Module.prototype._loadScriptSync = function (filename) {
  var content = fs.readFile(filename);
  // remove shebang
  content = content.replace(/^\#\!.*/, '');
  var e = this._loadContent(content, filename);
  if (e) {
    throw e;
  } else {
    this.loaded = true;
  }
};


Module.prototype._loadScript = function (filename, callback) {
  var self = this;
  cat(filename, callback, function(err, content) {
    if (err)
      return callback(err);
    var e = self._loadContent(content, filename);
    if (e) {
      return callback(e);
    }
    self._waitChildrenLoad(function () {
      self.loaded = true;
      return callback(null, self.exports);
    });
  });
};


Module.prototype._waitChildrenLoad = function (callback) {
  var nloaded = 0;
  var children = this.children;
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.loaded) {
      nloaded++;
    } else {
      child.loadCallback = function (err) {
        nloaded++;
        if (children.length == nloaded && callback) callback();
      };
    }
  }
  if (children.length == nloaded && callback) callback();
};


process.exit = function (code) {
  process.emit("exit");
  process.reallyExit(code);
};

var cwd = process.cwd();

// Make process.argv[0] and process.argv[1] into full paths.
if (process.argv[0].indexOf('/') > 0) {
  process.argv[0] = path.join(cwd, process.argv[0]);
}

if (process.argv[1].charAt(0) != "/" && !(/^http:\/\//).exec(process.argv[1])) {
  process.argv[1] = path.join(cwd, process.argv[1]);
}

// Load the main module--the command line argument.
process.mainModule = new Module(".");
process.mainModule.load(process.argv[1], function(err){
  if (err)
    throw err;
});

// All our arguments are loaded. We've evaluated all of the scripts. We
// might even have created TCP servers. Now we enter the main eventloop. If
// there are no watchers on the loop (except for the ones that were
// ev_unref'd) then this function exits. As long as there are active
// watchers, it blocks.
process.loop();

process.emit("exit");

})
