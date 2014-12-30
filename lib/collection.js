
/*!
 * Module dependencies.
 */

var STATES = require('./connectionstate'),
    queryComposer = require('./querycomposer'),
    utils = require('./utils');

/**
 * Abstract Collection constructor
 *
 * This is the base class that drivers inherit from and implement.
 *
 * @param {String} name name of the collection
 * @param {Connection} conn A MongooseConnection instance
 * @param {Object} opts optional collection options
 * @api public
 */

function Collection (dbCol, conn, opts) {
  if (undefined === opts) opts = {};
  if (undefined === opts.capped) opts.capped = {};

  opts.bufferCommands = undefined === opts.bufferCommands
    ? true
    : opts.bufferCommands;

  if ('number' == typeof opts.capped) {
    opts.capped = { size: opts.capped };
  }

  this.opts = opts;
  this.name = dbCol.id;
  this.dbCollection = dbCol;
  this.conn = conn;
  this.queue = [];
  this.buffer = this.opts.bufferCommands;

  if (STATES.connected == this.conn.readyState) {
    this.onOpen();
  }
};

/**
 * The collection name
 *
 * @api public
 * @property name
 */

Collection.prototype.name;

/**
 * The Connection instance
 *
 * @api public
 * @property conn
 */

Collection.prototype.conn;

/**
 * Called when the database connects
 *
 * @api private
 */

Collection.prototype.onOpen = function () {
  var self = this;
  this.buffer = false;
  self.doQueue();
};

/**
 * Called when the database disconnects
 *
 * @api private
 */

Collection.prototype.onClose = function () {
  if (this.opts.bufferCommands) {
    this.buffer = true;
  }
};

/**
 * Queues a method for later execution when its
 * database connection opens.
 *
 * @param {String} name name of the method to queue
 * @param {Array} args arguments to pass to the method when executed
 * @api private
 */

Collection.prototype.addQueue = function (name, args) {
  this.queue.push([name, args]);
  return this;
};

/**
 * Executes all queued methods and clears the queue.
 *
 * @api private
 */

Collection.prototype.doQueue = function () {
  for (var i = 0, l = this.queue.length; i < l; i++){
    this[this.queue[i][0]].apply(this, this.queue[i][1]);
  }
  this.queue = [];
  return this;
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.ensureIndex = function(){
  throw new Error('Collection#ensureIndex unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.findAndModify = function(){
  throw new Error('Collection#findAndModify unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.findOne = function(){
  throw new Error('Collection#findOne unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.find = function(select, options, callback){
  //console.log(select, options);

  //var squel = require('squel');

  var fields = options.fields;

  var model;
  for(var i in this.conn.models)
    if(this.conn.models[i].collection.name == this.name){
      model = this.conn.models[i];
      break;
    }

  
  //var query = squel.select({nameQuoteCharacter: '\'', autoQuoteAliasNames: false})
  //  .from("ROOT", "r");

  var slice = [],
      elementMatch = [],
      meta = [],
      $ = [];

  if(fields){
    for(var i in fields){
      //if(fields[i])
      //  query.field(i);
      
      if(typeof(fields[i]) == 'object'){
        if(fields[i].slice)
          slice[i] = fields[i].slice;

        if(fields[i].elementMatch)
          elementMatch.push(i);
        if(fields[i].meta){
          //meta.push(i);
          return callback(new Error('Error: $meta projection operator not yet implemented'));
        }
        if(fields[i].$)
          $.push(i);
      }
    }
  }
  /*
  if(select){
    for(var i in select)
      query.where('r.' + i + '=\'' + select[i] + '\'')
  }*/

  query = queryComposer.composeQuery(select, fields, model);
  
  //@ŢODO: format query with colors @see https://github.com/defunctzombie/node-util/blob/master/util.js#L125
  if(this.conn.base.options.debug)
    console.log('\u001b[32mQuery: \u001b[39m' + query);

  this.conn.server.queryDocuments(this.dbCollection._self, query.toString()).toArray(function (err, docs) {
    if (err) return callback(err);

    if(options.skip)
      docs = docs.slice(options.skip);

    if(options.limit)
      docs = docs.slice(0, options.limit);      

    if(options.sort){
      if(typeof(options.sort) == 'object' ){
        var sort = [];
        for(var i in options.sort)
          sort.push({field: i, order: options.sort[i]});

        for(var i = sort.length - 1; i >= 0; i--)
          docs.sort(function(a, b){
            if(sort[i].order)
              return a[sort[i].field] > b[sort[i].field];
            else
              return a[sort[i].field] < b[sort[i].field];
          });
      }
    } 

    
    for(var i = 0; i < docs.length; i++){
      if(slice.length){
        for(var s in slice){
          if(typeof(slice[s]) == 'number'){
            if(slice[s] > 0)
              docs[i][s] = docs[i][s].slice(0, slice[s]);
            else
              docs[i][s] = docs[i][s].slice(slice[s]);
          } else {
            docs[i][s] = docs[i][s].slice(slice[s][0], slice[s][0] + slice[s][1]);
          }
        }
      }

      if(elementMatch.length){
        for(var e in elementMatch){
          var found;
          for(var j in docs[i][e]){
            var check = true;
            for(var c in elementMatch[e]){
              if(elementMatch[e][c] != docs[i][e][j][c]){
                check = false;
                break;
              }
            }
            if(check){
              found = docs[i][e][j];
            }
          }
          docs[i][e] = found;
        }
      }


      if($.length){
        for(var s in $)
          if(docs[i][s].length > $[s])
            docs[i][s] = docs[i][s][$[s]];
      }

    }
    callback(null, docs);
  });

  //throw new Error('Collection#find unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.insert = function(docs, options, callback){
  if('function' === typeof options) callback = options, options = {};
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;

  var connection = this.conn.server;

  
  insertWithWriteCommands(this, Array.isArray(docs) ? docs : [docs], options, callback);
  return this;
};

var insertWithWriteCommands = function(self, docs, options, callback) {
  // Get the intended namespace for the operation
  self.collectionName = self.name
  var namespace = self.collectionName;

  // Ensure we have no \x00 bytes in the name causing wrong parsing
  if(!!~namespace.indexOf("\x00")) {
    return callback(new Error("namespace cannot contain a null character"), null);
  }

  // Check if we have passed in continue on error
  var continueOnError = typeof options['keepGoing'] == 'boolean' 
    ? options['keepGoing'] : false;
  continueOnError = typeof options['continueOnError'] == 'boolean' 
    ? options['continueOnError'] : continueOnError;

  // Do we serialzie functions
  var serializeFunctions = typeof options.serializeFunctions != 'boolean' 
    ? self.serializeFunctions : options.serializeFunctions;

  // Checkout a write connection
  var connection = self.conn;  

  // Do we return the actual result document
  var fullResult = typeof options.fullResult == 'boolean' ? options.fullResult : false;

  
  // Collect errorOptions
  /*var errorOptions = shared._getWriteConcern(self, options);

  // If we have a write command with no callback and w:0 fail
  if(errorOptions.w && errorOptions.w != 0 && callback == null) {
    throw new Error("writeConcern requires callback")
  }
  */
  var errorOptions = {}
  // Add the documents and decorate them with id's if they have none
  for(var index = 0, len = docs.length; index < len; ++index) {
    var doc = docs[index];

    // Add id to each document if it's not already defined
    if (!(Buffer.isBuffer(doc))
      && doc['_id'] == null
      && self.db.forceServerObjectId != true
      && options.forceServerObjectId != true) {
        doc['_id'] = self.pkFactory.createPk();
    }
  }

  // Single document write
  if(docs.length == 1) {
    // Execute the write command
    return connection.server.createDocument(connection.collections[namespace].dbCollection._self, docs[0], function(err, results) {
      if(errorOptions.w == 0 && typeof callback == 'function') return callback(null, null);
      if(errorOptions.w == 0) return;
      if(callback == null) return;
      if(err != null) return callback(err, null);
      
      if(fullResult) return callback(null, results);
      
      callback(null, docs)
    });


    
    /*return self.db.command(write_command
      , { connection:connection
        , checkKeys: typeof options.checkKeys == 'boolean' ? options.checkKeys : true
        , serializeFunctions: serializeFunctions
        , writeCommand: true }
      , function(err, result) {  
        if(errorOptions.w == 0 && typeof callback == 'function') return callback(null, null);
        if(errorOptions.w == 0) return;
        if(callback == null) return;
        if(err != null) {
          return callback(err, null);
        }

        // Result has an error
        if(!result.ok || Array.isArray(result.writeErrors) && result.writeErrors.length > 0) {
          var error = utils.toError(result.writeErrors[0].errmsg);
          error.code = result.writeErrors[0].code;
          error.err = result.writeErrors[0].errmsg;
          
          if (fullResult) return callback(error, result.getRawResponse());
          // Return the error
          return callback(error, null);
        }

        if(fullResult) return callback(null, result);
        // Return the results for a whole batch
        callback(null, docs)
    }); */  
  } else {
    try {
      // Multiple document write (use bulk)
      var bulk = !continueOnError ? self.initializeOrderedBulkOp() : self.initializeUnorderedBulkOp();
      // Add all the documents
      for(var i = 0; i < docs.length;i++) {
        bulk.insert(docs[i]);
      }

      // Execute the command
      bulk.execute(errorOptions, function(err, result) {
        if(errorOptions.w == 0 && typeof callback == 'function') return callback(null, null);
        if(errorOptions.w == 0) return;
        if(callback == null) return;
        if(err) return callback(err, null);
        if(result.hasWriteErrors()) {
          var error = result.getWriteErrors()[0];
          error.code = result.getWriteErrors()[0].code;
          error.err = result.getWriteErrors()[0].errmsg;        
          
          if (fullResult) return callback(error, result.getRawResponse());
          // Return the error
          return callback(error, null);
        }

        if(fullResult) return callback(null, result.getRawResponse());
        // Return the results for a whole batch
        callback(null, docs)
      });
    } catch(err) {
      callback(utils.toError(err), null);
    }
  }
}

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.save = function(){
  throw new Error('Collection#save unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.update = function(select, data, options, callback){
  var self = this;

  this.find(select, {}, function(err, docs){
    if(err) return callback(err);
    if(!docs) return callback();

    utils.asyncMapFn(
      docs,
      function(doc, cb){
        for(var i in data.$set)
          doc[i] = data.$set[i];
        self.conn.server.replaceDocument(doc._self, doc, {}, cb);
      }, callback);
  });  
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.remove = function(select, options, callback){
  var self = this;

  this.find(select, {}, function(err, docs){
    if(err) return callback(err);
    if(!docs) return callback();

    utils.asyncMapFn(
      docs,
      function(doc, cb){
        self.conn.server.deleteDocument(doc._self, {}, cb);
      }, callback);
  });
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.getIndexes = function(){
  throw new Error('Collection#getIndexes unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.mapReduce = function(){
  throw new Error('Collection#mapReduce unimplemented by driver');
};

/*!
 * Module exports.
 */

module.exports = Collection;





/*!
 * Debug print helper
 */

function format (obj, sub) {
  var x = utils.clone(obj);
  if (x) {
    if ('Binary' === x.constructor.name) {
      x = '[object Buffer]';
    } else if ('ObjectID' === x.constructor.name) {
      var representation = 'ObjectId("' + x.toHexString() + '")';
      x = { inspect: function() { return representation; } };
    } else if ('Date' === x.constructor.name) {
      var representation = 'new Date("' + x.toUTCString() + '")';
      x = { inspect: function() { return representation; } };
    } else if ('Object' === x.constructor.name) {
      var keys = Object.keys(x)
        , i = keys.length
        , key
      while (i--) {
        key = keys[i];
        if (x[key]) {
          if ('Binary' === x[key].constructor.name) {
            x[key] = '[object Buffer]';
          } else if ('Object' === x[key].constructor.name) {
            x[key] = format(x[key], true);
          } else if ('ObjectID' === x[key].constructor.name) {
            ;(function(x){
              var representation = 'ObjectId("' + x[key].toHexString() + '")';
              x[key] = { inspect: function() { return representation; } };
            })(x)
          } else if ('Date' === x[key].constructor.name) {
            ;(function(x){
              var representation = 'new Date("' + x[key].toUTCString() + '")';
              x[key] = { inspect: function() { return representation; } };
            })(x)
          } else if (Array.isArray(x[key])) {
            x[key] = x[key].map(function (o) {
              return format(o, true)
            });
          }
        }
      }
    }
    if (sub) return x;
  }

  return require('util')
    .inspect(x, false, 10, true)
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
}