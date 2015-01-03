/*!
 * Module dependencies.
 */

var DocumentDb = require('documentdb'),
    DocumentClient = DocumentDb.DocumentClient,

    STATES = require('./connectionstate'),
    EventEmitter = require('events').EventEmitter,

    utils = require('./utils'),

    Collection  = require('./collection'),
    DocoomentError = require('./error');

/*var url = require('url')
  , utils = require('./utils')
  , 
  , driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native'
  , Model = require('./model')
  , Schema = require('./schema')
  , Collection  = require(driver + '/collection'),
  , assert =require('assert')
  , muri = require('muri')
*/

/**
 * Connection constructor
 *
 * For practical reasons, a Connection equals a Db.
 *
 * @param {DocoomentDb} base a docooment instanceof
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `connecting`: Emitted when `connection.{open,openSet}()` is executed on this connection.
 * @event `connected`: Emitted when this connection successfully connects to the db. May be emitted _multiple_ times in `reconnected` scenarios.
 * @event `open`: Emitted after we `connected` and `onOpen` is executed on all of this connections models.
 * @event `disconnecting`: Emitted when `connection.close()` was executed.
 * @event `disconnected`: Emitted after getting disconnected from the db.
 * @event `close`: Emitted after we `disconnected` and `onClose` executed on all of this connections models.
 * @event `reconnected`: Emitted after we `connected` and subsequently `disconnected`, followed by successfully another successfull connection.
 * @event `error`: Emitted when an error occurs on this connection.
 * @event `fullsetup`: Emitted in a replica-set scenario, when all nodes specified in the connection string are connected.
 * @api public
 */

function Connection (base) {
   this.server = null;
   this.host = null;
   this.port = null;
   this.options = null;
   this.database = null;
   this.collections = {};
   this.models = {};
   this.otherDbs = [];
   this._readyState = STATES.disconnected;
   this._closeCalled = false;
   this._hasOpened = false;
   this.base = base;

/*
  this.replica = false;
  this.hosts = null;
  this.user = null;
  this.pass = null;
  this.name = null;*/ 
  
};

/*!
 * Inherit from EventEmitter
 */

Connection.prototype.__proto__ = EventEmitter.prototype;

/**
 * Connection ready state
 *
 * - 0 = disconnected
 * - 1 = connected
 * - 2 = connecting
 * - 3 = disconnecting
 *
 * Each state change emits its associated event name.
 *
 * ####Example
 *
 *     conn.on('connected', callback);
 *     conn.on('disconnected', callback);
 *
 * @property readyState
 * @api public
*/

Object.defineProperty(Connection.prototype, 'readyState', {
   get: function(){ return this._readyState; },
   set: function (val) {
      if (!(val in STATES)) {
         throw new Error('Invalid connection state: ' + val);
      }

      if (this._readyState !== val) {
         this._readyState = val;
         // loop over the otherDbs on this connection and change their state
         for (var i = 0; i < this.otherDbs.length; i++) {
            this.otherDbs[i].readyState = val;
         }

         if (STATES.connected === val)
            this._hasOpened = true;

         this.emit(STATES[val]);
      }
   }
});

/**
 * A hash of the collections associated with this connection
 *
 * @property collections
 */

Connection.prototype.collections;

/**
 * The mongodb.Db instance, set when the connection is opened
 *
 * @property db
 */

Connection.prototype.db;

/**
 * Opens the connection to DocumentDb.
 *
 * `options` is a hash with the following possible properties:
 *
 *     db      - passed to the connection db instance
 *     server  - passed to the connection server instance
 *     user    - username for authentication
 *     pass    - password for authentication
 *     auth    - options for authentication (see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate)
 *
 * ####Notes:
 *
 * Docooment forces the db option `forceServerObjectId` false and cannot be overridden.
 * Docooment defaults the server `auto_reconnect` options to true which can be overridden.
 * See the node-mongodb-native driver instance for options that it understands.
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * @param {String} connection_string mongodb://uri or the host to which you are connecting
 * @param {Number} [port] database port
 * @param {String} [database] database name
 * @param {Object} [options] options
 * @param {Function} [callback]
 * @see node-mongodb-native https://github.com/mongodb/node-mongodb-native
 * @see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate
 * @api public
 */

Connection.prototype.open = function (host, port, database, options, callback) {
   
   if (STATES.disconnected !== this.readyState) {
      var err = new Error('Trying to open unclosed connection.');
      err.state = this.readyState;
      this.error(err, callback);
      return this;
   }

   if (!host) {
      this.error(new Error('Missing hostname.'), callback);
      return this;
   }

   if (!database) {
      this.error(new Error('Missing database name.'), callback);
      return this;
   }

   // authentication
   if (options && options.user && options.pass) {
      this.user = options.user;
      this.pass = options.pass;
   } else {
      this.user = this.pass = undefined;
   }




   this.readyState = STATES.connecting;
   this._closeCalled = false;

   var self = this;
   
   this.host = host;
   this.port = port;
   this.database = database;
   this.options = options;

   /*
      this._open(callback);
      this._open(callback);
   */

   this.server = new DocumentClient(this.host + ':' + this.port + '/', this.options);

   self.server.queryDatabases('SELECT * FROM root r').toArray(function (err, databases) {    
      if (err) {
         return callback(err);
      }
      
      self.databases = databases;

      for (var i = 0; i < databases.length; i++)
         if (databases[i].id == database){
            self.database = databases[i];            
         } else {
            self.otherDbs.push(databases[i]);
         }

      if(!self.database)
         return callback({message: 'Database not found'});

      self.server.queryCollections(self.database._self, 'SELECT * FROM root r').toArray(function (err, collections) {
         if (err) {
            self.readyState = STATES.disconnected;
            if (self._hasOpened) {
               if (callback) callback(err);
            } else {
               self.error(err, callback);
            }
         }

         for(var i = 0; i < collections.length; i++){
            if(!self.collections[collections[i].id]){
               self.collections[collections[i].id] = new Collection(collections[i], self);//, options
            } else {
               self.collections[collections[i].id].setDbCollection(collections[i]);
            }
         }
        
         utils.asyncMapFn(
            self.collections,
            function(collection, cb){
               if(!collection.dbCollection._self) return cb();
               
               collection.ensureQueryUDF(cb);
            }, 
            function(err){
               if (err) {
                  self.readyState = STATES.disconnected;
                  if (self._hasOpened) {
                     if (callback) callback(err);
                  } else {
                     self.error(err, callback);
                  }
               }

               self.onOpen(callback);
            });
      });
   }); 

   return this;
};


/**
 * error
 *
 * Graceful error handling, passes error to callback
 * if available, else emits error on the connection.
 *
 * @param {Error} err
 * @param {Function} callback optional
 * @api private
 */

Connection.prototype.error = function (err, callback) {
   if (callback) return callback(err);
   this.emit('error', err);
}


/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function (callback) {
   var self = this;

   self.readyState = STATES.connected;

   for (var i in self.collections)
      self.collections[i].onOpen();

   callback && callback();
   self.emit('open');  
};

/**
 * Closes the connection
 *
 * @param {Function} [callback] optional
 * @return {Connection} self
 * @api public
 */

Connection.prototype.close = function (callback) {
   var self = this;
   this._closeCalled = true;

   switch (this.readyState){
      case 0: // disconnected
         callback && callback();
      break;

      case 1: // connected
         this.readyState = STATES.disconnecting;
         this.onClose(function(err){
            if (err){
               self.error(err, callback);
            } else {
               self.onClose();
               callback && callback();
            }
         });
      break;

      case 2: // connecting
         this.once('open', function(){
            self.close(callback);
         });
      break;

      case 3: // disconnecting
         if (!callback) break;
         this.once('close', function () {
            callback();
         });
      break;
  }

  return this;
};

/**
 * Called when the connection closes
 *
 * @api private
 */

Connection.prototype.onClose = function () {
   this.readyState = STATES.disconnected;

   for (var i in this.collections)
      this.collections[i].onClose();

   this.emit('close');
};

/**
 * Retrieves a collection, creating it if not cached.
 *
 * Not typically needed by applications. Just talk to your collection through your model.
 *
 * @param {String} name of the collection
 * @param {Object} [options] optional collection options
 * @return {Collection} collection instance
 * @api public
 */

Connection.prototype.collection = function (name, options) {
   if (!(name in this.collections))
      this.collections[name] = new Collection(name, this, options);
  return this.collections[name];
};

/**
 * Defines or retrieves a model.
 *
 *     var docooment = require('docooment-db');
 *     var db = docooment.createConnection(..);
 *     db.model('Venue', new Schema(..));
 *     var Ticket = db.model('Ticket', new Schema(..));
 *     var Venue = db.model('Venue');
 *
 * _When no `collection` argument is passed, DocoomentDB produces a collection name by passing the model `name` to the [utils.toCollectionName](#utils_exports.toCollectionName) method. This method pluralizes the name. If you don't like this behavior, either pass a collection name or set your schemas collection name option._
 *
 * ####Example:
 *
 *     var schema = new Schema({ name: String }, { collection: 'actor' });
 *
 *     // or
 *
 *     schema.set('collection', 'actor');
 *
 *     // or
 *
 *     var collectionName = 'actor'
 *     var M = conn.model('Actor', schema, collectionName)
 *
 * @param {String} name the model name
 * @param {Schema} [schema] a schema. necessary when defining a model
 * @param {String} [collection] name of documentdb collection (optional) if not given it will be induced from model name
 * @see DocoomentDB#model #index_DocoomentDB-model
 * @return {Model} The compiled model
 * @api public
 */

Connection.prototype.model = function (name, schema, collection) {
   // collection name discovery
   if ('string' == typeof schema) {
      collection = schema;
      schema = false;
   }

   if (utils.isObject(schema) && !(schema instanceof Schema)) {
      schema = new Schema(schema);
   }

   if (this.models[name] && !collection) {
      // model exists but we are not subclassing with custom collection
      if (schema instanceof Schema && schema != this.models[name].schema) {
         throw new DocoomentError.OverwriteModelError(name);
      }
      return this.models[name];
   }

   var opts = { cache: false, connection: this }
   var model;

   if (schema instanceof Schema) {
      // compile a model
      model = this.base.model(name, schema, collection, opts)

      // only the first model with this name is cached to allow
      // for one-offs with custom collection names etc.
      if (!this.models[name]) {
         this.models[name] = model;
      }

      model.init();
      return model;
   }

   if (this.models[name] && collection) {
      // subclassing current model with alternate collection
      model = this.models[name];
      schema = model.prototype.schema;
      var sub = model.__subclass(this, schema, collection);
      // do not cache the sub model
      return sub;
   }

   // lookup model in docooment module
   model = this.base.models[name];

   if (!model) {
      throw new MongooseError.MissingSchemaError(name);
   }

   if (this == model.prototype.db
      && (!collection || collection == model.collection.name)) {
      // model already uses this connection.

      // only the first model with this name is cached to allow
      // for one-offs with custom collection names etc.
      if (!this.models[name]) {
         this.models[name] = model;
      }

      return model;
   }

   return this.models[name] = model.__subclass(this, schema, collection);
}

/**
 * Returns an array of model names created on this connection.
 * @api public
 * @return {Array}
 */

Connection.prototype.modelNames = function () {
  return Object.keys(this.models);
}

/**
 * Set profiling level.
 *
 * @param {Number|String} level either off (0), slow (1), or all (2)
 * @param {Number} [ms] the threshold in milliseconds above which queries will be logged when in `slow` mode. defaults to 100.
 * @param {Function} callback
 * @api public
 */
//@TODO
Connection.prototype.setProfiling = function (level, ms, callback) {}
/*  if (STATES.connected !== this.readyState) {
    return this.on('open', this.setProfiling.bind(this, level, ms, callback));
  }

  if (!callback) callback = ms, ms = 100;

  var cmd = {};

  switch (level) {
    case 0:
    case 'off':
      cmd.profile = 0;
      break;
    case 1:
    case 'slow':
      cmd.profile = 1;
      if ('number' !== typeof ms) {
        ms = parseInt(ms, 10);
        if (isNaN(ms)) ms = 100;
      }
      cmd.slowms = ms;
      break;
    case 2:
    case 'all':
      cmd.profile = 2;
      break;
    default:
      return callback(new Error('Invalid profiling level: '+ level));
  }

  this.db.executeDbCommand(cmd, function (err, resp) {
    if (err) return callback(err);

    var doc = resp.documents[0];

    err = 1 === doc.ok
      ? null
      : new Error('Could not set profiling level to: '+ level)

    callback(err, doc);
  });
};
*/

/*!
 * Noop.
 */

function noop () {}

/*!
 * Module exports.
 */

Connection.STATES = STATES;
module.exports = Connection;
