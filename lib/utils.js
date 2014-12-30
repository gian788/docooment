/*!
 * Module dependencies.
 */

var sliced = require('sliced'),
  	mpath = require('mpath'),
	
  	ObjectId = require('./types/objectid'),

  	DocoomentArray,
  	Document;
 

/*!
 * Produces a collection name from model `name`.
 *
 * @param {String} name a model name
 * @return {String} a collection name
 * @api private
 */

exports.toCollectionName = function (name, options) {
  options = options || {};
  if ('system.profile' === name) return name;
  if ('system.indexes' === name) return name;
  if (options.pluralization === false) return name;
  return pluralize(name.toLowerCase());
  return name.toLowerCase();
};

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `toCollectionName`.
 *
 * @deprecated remove in 4.x gh-1350
 */

exports.pluralization = [
  [/(m)an$/gi, '$1en'],
  [/(pe)rson$/gi, '$1ople'],
  [/(child)$/gi, '$1ren'],
  [/^(ox)$/gi, '$1en'],
  [/(ax|test)is$/gi, '$1es'],
  [/(octop|vir)us$/gi, '$1i'],
  [/(alias|status)$/gi, '$1es'],
  [/(bu)s$/gi, '$1ses'],
  [/(buffal|tomat|potat)o$/gi, '$1oes'],
  [/([ti])um$/gi, '$1a'],
  [/sis$/gi, 'ses'],
  [/(?:([^f])fe|([lr])f)$/gi, '$1$2ves'],
  [/(hive)$/gi, '$1s'],
  [/([^aeiouy]|qu)y$/gi, '$1ies'],
  [/(x|ch|ss|sh)$/gi, '$1es'],
  [/(matr|vert|ind)ix|ex$/gi, '$1ices'],
  [/([m|l])ouse$/gi, '$1ice'],
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/([^a-z])$/, '$1'],
  [/$/gi, 's']
];
var rules = exports.pluralization;

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `toCollectionName`.
 * @api public
 */

exports.uncountables = [
  'advice',
  'energy',
  'excretion',
  'digestion',
  'cooperation',
  'health',
  'justice',
  'labour',
  'machinery',
  'equipment',
  'information',
  'pollution',
  'sewage',
  'paper',
  'money',
  'species',
  'series',
  'rain',
  'rice',
  'fish',
  'sheep',
  'moose',
  'deer',
  'news',
  'expertise',
  'status',
  'media'
];
var uncountables = exports.uncountables;

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize (str) {
  var rule, found;
  if (!~uncountables.indexOf(str.toLowerCase())){
    found = rules.filter(function(rule){
      return str.match(rule[0]);
    });
    if (found[0]) return str.replace(found[0][0], found[0][1]);
  }
  return str;
};

/*!
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */

exports.deepEqual = function deepEqual (a, b) {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();

  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() === b.toString();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source == b.source &&
           a.ignoreCase == b.ignoreCase &&
           a.multiline == b.multiline &&
           a.global == b.global;
  }

  if (typeof a !== 'object' && typeof b !== 'object')
    return a == b;

  if (a === null || b === null || a === undefined || b === undefined)
    return false

  if (a.prototype !== b.prototype) return false;

  // Handle DocoomentNumbers
  if (a instanceof Number && b instanceof Number) {
    return a.valueOf() === b.valueOf();
  }

  if (Buffer.isBuffer(a)) {
    return exports.buffer.areEqual(a, b);
  }

  if (isDocoomentObject(a)) a = a.toObject();
  if (isDocoomentObject(b)) b = b.toObject();

  try {
    var ka = Object.keys(a),
        kb = Object.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }

  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;

  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();

  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }

  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

/*!
 * Object clone with Docooment natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to DocumentDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */

exports.clone = function clone (obj, options) {
  if (obj === undefined || obj === null)
    return obj;

  if (Array.isArray(obj))
    return cloneArray(obj, options);

  if (isDocoomentObject(obj)) {
    if (options && options.json && 'function' === typeof obj.toJSON) {
      return obj.toJSON(options);
    } else {
      return obj.toObject(options);
    }
  }

  if (obj.constructor) {
    switch (obj.constructor.name) {
      case 'Object':
        return cloneObject(obj, options);
      case 'Date':
        return new obj.constructor(+obj);
      case 'RegExp':
        return cloneRegExp(obj);
      default:
        // ignore
        break;
    }
  }

  if (obj instanceof ObjectId)
    return new ObjectId(obj.id);

  if (!obj.constructor && exports.isObject(obj)) {
    // object created with Object.create(null)
    return cloneObject(obj, options);
  }

  if (obj.valueOf)
    return obj.valueOf();
};
var clone = exports.clone;

/*!
 * ignore
 */

function cloneObject (obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder
    , minimize = options && options.minimize
    , ret = {}
    , hasKeys
    , keys
    , val
    , k
    , i

  if (retainKeyOrder) {
    for (k in obj) {
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  } else {
    // faster

    keys = Object.keys(obj);
    i = keys.length;

    while (i--) {
      k = keys[i];
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        if (!hasKeys) hasKeys = true;
        ret[k] = val;
      }
    }
  }

  return minimize
    ? hasKeys && ret
    : ret;
};

function cloneArray (arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i], options));
  return ret;
};

/*!
 * Shallow copies defaults into options.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 * @api private
 */

exports.options = function (defaults, options) {
  var keys = Object.keys(defaults)
    , i = keys.length
    , k ;

  options = options || {};

  while (i--) {
    k = keys[i];
    if (!(k in options)) {
      options[k] = defaults[k];
    }
  }

  return options;
};

/*!
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

exports.merge = function merge (to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key;

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      to[key] = from[key];
    } else if (exports.isObject(from[key])) {
      merge(to[key], from[key]);
    }
  }
};

/*!
 * toString helper
 */

var toString = Object.prototype.toString;

/*!
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */

exports.isObject = function (arg) {
  return '[object Object]' == toString.call(arg);
}

/*!
 * A faster Array.prototype.slice.call(arguments) alternative
 * @api private
 */

exports.args = sliced;

/*!
 * process.nextTick helper.
 *
 * Wraps `callback` in a try/catch + nextTick.
 *
 * node-mongodb-native has a habit of state corruption when an error is immediately thrown from within a collection callback.
 *
 * @param {Function} callback
 * @api private
 */

exports.tick = function tick (callback) {
  if ('function' !== typeof callback) return;
  return function () {
    try {
      callback.apply(this, arguments);
    } catch (err) {
      // only nextTick on err to get out of
      // the event loop and avoid state corruption.
      process.nextTick(function () {
        throw err;
      });
    }
  }
}

/*!
 * Returns if `v` is a docooment object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

exports.isDocoomentObject = function (v) {
  Document || (Document = require('./document'));
  DocoomentArray || (DocoomentArray = require('./types').Array);
  //DocoomentBuffer || (DocoomentBuffer = require('./types').Buffer);

  return v instanceof Document ||
         v instanceof DocoomentArray /*||
         v instanceof DocoomentBuffer*/
}
var isDocoomentObject = exports.isDocoomentObject;

/*!
 * Converts `expires` options of index objects to `expiresAfterSeconds` options for MongoDB.
 *
 * @param {Object} object
 * @api private
 */

exports.expires = function expires (object) {
  if (!(object && 'Object' == object.constructor.name)) return;
  if (!('expires' in object)) return;

  var when;
  if ('string' != typeof object.expires) {
    when = object.expires;
  } else {
    when = Math.round(ms(object.expires) / 1000);
  }
  object.expireAfterSeconds = when;
  delete object.expires;
}

/*!
 * Returns if `v` is an objectId.
 *
 * @param {any} v
 * @api private
 */

exports.isObjectId = function (v) {
  return v instanceof ObjectId;
}

/*!
 * Return the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Object} obj
 */

exports.getValue = function (path, obj, map) {
  return mpath.get(path, obj, '_doc', map);
}

/*!
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} obj
 */

exports.setValue = function (path, val, obj, map) {
  mpath.set(path, val, obj, '_doc', map);
}

/*!
 * Returns an array of values from object `o`.
 *
 * @param {Object} o
 * @return {Array}
 * @private
 */

exports.object = {};
exports.object.vals = function vals (o) {
  var keys = Object.keys(o)
    , i = keys.length
    , ret = [];

  while (i--) {
    ret.push(o[keys[i]]);
  }

  return ret;
}

/*!
 * @see exports.options
 */

exports.object.shallowCopy = exports.options;

/*!
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 */

var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function (obj, prop) {
  return hop.call(obj, prop);
}

/**
 * merges to with a copy of from
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

exports.mergeClone = function(to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      // make sure to retain key order here because of a bug handling the $each
      // operator in mongodb 2.4.4
      to[key] = exports.clone(from[key], { retainKeyOrder : 1});
    } else {
      if (exports.isObject(from[key])) {
        exports.mergeClone(to[key], from[key]);
      } else {
        // make sure to retain key order here because of a bug handling the
        // $each operator in mongodb 2.4.4
        to[key] = exports.clone(from[key], { retainKeyOrder : 1});
      }
    }
  }
}




exports.asyncMapFn = function(array, eachCb, callback){
   var results = [],
       count = 0,
       len = 0,
       error;

   var fn = function(index, field){
      if(!field) field = index;

      eachCb(array[field], function(err, res){
         if(err){
            if(error) return;
            error = err;
            return callback(error);
         }
         
         results[index] = res;         
         if(results.length == len)
            return callback(null, results);
      });   
   }

   if(array.length == 0)
      return callback();

   if(array.length){
      len = array.length;
      for(var i = 0; i < array.length; i++)
         fn(i);
   } else {
      for(var i in array)
         len++;
      var i = 0;
      for(var p in array)
         fn(i++, p);
   }
}