'use strict';

/*!
 * Module dependencies.
 */

var Connection = require('./connection'),
    Collection = require('./collection'),
    Schema = require('./schema'),
    SchemaType = require('./schematype'),
    VirtualType = require('./virtualtype'),
    //SchemaDefaults = require('./schemadefault'),
    STATES = require('./connectionstate'),
    Types = require('./types'),
    Query = require('./query'),
  //, Promise = require('./promise')
    Model = require('./model'),
    Document = require('./document'),
    utils = require('./utils'),
    format = utils.toCollectionName,
    pkg = require('../package.json');

/*!
 * Warn users if they are running an unstable release.
 *
 * Disable the warning by setting the MONGOOSE_DISABLE_STABILITY_WARNING
 * environment variable.
 */

if (pkg.publishConfig && 'unstable' == pkg.publishConfig.tag) {
  if (!process.env.MONGOOSE_DISABLE_STABILITY_WARNING) {
    console.log('\u001b[33m');
    console.log('##############################################################');
    console.log('#');
    console.log('#   !!! MONGOOSE WARNING !!!');
    console.log('#');
    console.log('#   This is an UNSTABLE release of Docooment.');
    console.log('#   Unstable releases are available for preview/testing only.');
    console.log('#   DO NOT run this in production.');
    console.log('#');
    console.log('##############################################################');
    console.log('\u001b[0m');
  }
}

/**
 * Docooment constructor.
 *
 * The exports object of the `docooment` module is an instance of this class.
 * Most apps will only use this one instance.
 *
 * @api public
 */

function Docooment () {
  this.connections = [];
  this.plugins = [];
  this.models = {};
  this.modelSchemas = {};;
  // default global options
  this.options = {};
  
  var conn = this.createConnection(); // default connection
  conn.models = this.models;
};

/**
 * Expose connection states for user-land
 * 
 */
Docooment.prototype.STATES = STATES;

/**
 * Sets docooment options
 *
 * ####Example:
 *
 *     docooment.set('test', value) // sets the 'test' option to `value`
 *
 *     docooment.set('debug', true) // enable logging collection methods + arguments to the console
 *
 * @param {String} key
 * @param {String} value
 * @api public
 */

Docooment.prototype.set = function (key, value) {
  if (arguments.length == 1) {
    return this.options[key];
  }

  this.options[key] = value;
  return this;
};

/**
 * Gets docooment options
 *
 * ####Example:
 *
 *     docooment.get('test') // returns the 'test' value
 *
 * @param {String} key
 * @method get
 * @api public
 */

Docooment.prototype.get = Docooment.prototype.set;


/**
 * Creates a Connection instance.
 *
 * Each `connection` instance maps to a single database. This method is helpful when mangaging multiple db connections.
 *
 * If arguments are passed, they are proxied to either [Connection#open](#connection_Connection-open) or [Connection#openSet](#connection_Connection-openSet) appropriately. This means we can pass `db`, `server`, and `replset` options to the driver. _Note that the `safe` option specified in your schema will overwrite the `safe` db option specified here unless you set your schemas `safe` option to `undefined`. See [this](/docs/guide.html#safe) for more information._
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * ####Example:
 *
 *     // with mongodb:// URI
 *     db = docooment.createConnection('mongodb://user:pass@localhost:port/database');
 *
 *     // and options
 *     var opts = { db: { native_parser: true }}
 *     db = docooment.createConnection('mongodb://user:pass@localhost:port/database', opts);
 *
 *     // replica sets
 *     db = docooment.createConnection('mongodb://user:pass@localhost:port/database,mongodb://anotherhost:port,mongodb://yetanother:port');
 *
 *     // and options
 *     var opts = { replset: { strategy: 'ping', rs_name: 'testSet' }}
 *     db = docooment.createConnection('mongodb://user:pass@localhost:port/database,mongodb://anotherhost:port,mongodb://yetanother:port', opts);
 *
 *     // with [host, database_name[, port] signature
 *     db = docooment.createConnection('localhost', 'database', port)
 *
 *     // and options
 *     var opts = { server: { auto_reconnect: false }, user: 'username', pass: 'mypassword' }
 *     db = docooment.createConnection('localhost', 'database', port, opts)
 *
 *     // initialize now, connect later
 *     db = docooment.createConnection();
 *     db.open('localhost', 'database', port, [opts]);
 *
 * @param {String} [uri] a mongodb:// URI
 * @param {Object} [options] options to pass to the driver
 * @see Connection#open #connection_Connection-open
 * @see Connection#openSet #connection_Connection-openSet
 * @return {Connection} the created Connection object
 * @api public
 */

Docooment.prototype.createConnection = function () {
  var conn = new Connection(this);
  this.connections.push(conn);

  if (arguments.length) {
    conn.open.apply(conn, arguments);
  }

  return conn;
};

/**
 * Opens the default docooment connection.
 *
 * If arguments are passed, they are proxied to either [Connection#open](#connection_Connection-open) or [Connection#openSet](#connection_Connection-openSet) appropriately.
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * ####Example:
 *
 *     docooment.connect('mongodb://user:pass@localhost:port/database');
 *
 *     // replica sets
 *     var uri = 'mongodb://user:pass@localhost:port/database,mongodb://anotherhost:port,mongodb://yetanother:port';
 *     docooment.connect(uri);
 *
 *     // with options
 *     docooment.connect(uri, options);
 *
 *     // connecting to multiple mongos
 *     var uri = 'mongodb://hostA:27501,hostB:27501';
 *     var opts = { mongos: true };
 *     docooment.connect(uri, opts);
 *
 * @param {String} uri(s)
 * @param {Object} [options]
 * @param {Function} [callback]
 * @see Docooment#createConnection #index_Docooment-createConnection
 * @api public
 * @return {Docooment} this
 */

Docooment.prototype.connect = function () {
  var conn = this.connection;

  conn.open.apply(conn, arguments);

  return this;
};

/**
 * Disconnects all connections.
 *
 * @param {Function} [fn] called after all connection close.
 * @return {Docooment} this
 * @api public
 */

Docooment.prototype.disconnect = function (fn) {
  var count = this.connections.length,
      error;

  this.connections.forEach(function(conn){
    conn.close(function(err){
      if (error) return;

      if (err) {
        error = err;
        if (fn) return fn(err);
        throw err;
      }

      if (fn)
        --count || fn();
    });
  });
  return this;
};

/**
 * Defines a model or retrieves it.
 *
 * Models defined on the `docooment` instance are available to all connection created by the same `docooment` instance.
 *
 * ####Example:
 *
 *     var docooment = require('docooment');
 *
 *     // define an Actor model with this docooment instance
 *     docooment.model('Actor', new Schema({ name: String }));
 *
 *     // create a new connection
 *     var conn = docooment.createConnection(..);
 *
 *     // retrieve the Actor model
 *     var Actor = conn.model('Actor');
 *
 * _When no `collection` argument is passed, Docooment produces a collection name by passing the model `name` to the [utils.toCollectionName](#utils_exports.toCollectionName) method. This method pluralizes the name. If you don't like this behavior, either pass a collection name or set your schemas collection name option._
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
 *     var M = docooment.model('Actor', schema, collectionName)
 *
 * @param {String} name model name
 * @param {Schema} [schema]
 * @param {String} [collection] name (optional, induced from model name)
 * @param {Boolean} [skipInit] whether to skip initialization (defaults to false)
 * @api public
 */

Docooment.prototype.model = function (name, schema, collection, skipInit) {
  if ('string' == typeof schema) {
    collection = schema;
    schema = false;
  }

  if (utils.isObject(schema) && !(schema instanceof Schema)) {
    schema = new Schema(schema);
  }

  if ('boolean' === typeof collection) {
    skipInit = collection;
    collection = null;
  }

  // handle internal options from connection.model()
  var options;
  if (skipInit && utils.isObject(skipInit)) {
    options = skipInit;
    skipInit = true;
  } else {
    options = {};
  }

  // look up schema for the collection. this might be a
  // default schema like system.indexes stored in SchemaDefaults.
  if (!this.modelSchemas[name]) {
    if (!schema && name in SchemaDefaults) {
      schema = SchemaDefaults[name];
    }

    if (schema) {
      // cache it so we only apply plugins once
      this.modelSchemas[name] = schema;
      this._applyPlugins(schema);
    } else {
      throw new docooment.Error.MissingSchemaError(name);
    }
  }

  var model;
  var sub;

  // connection.model() may be passing a different schema for
  // an existing model name. in this case don't read from cache.
  if (this.models[name] && false !== options.cache) {
    if (schema instanceof Schema && schema != this.models[name].schema) {
      throw new docooment.Error.OverwriteModelError(name);
    }

    if (collection) {
      // subclass current model with alternate collection
      model = this.models[name];
      schema = model.prototype.schema;
      sub = model.__subclass(this.connection, schema, collection);
      // do not cache the sub model
      return sub;
    }

    return this.models[name];
  }

  // ensure a schema exists
  if (!schema) {
    schema = this.modelSchemas[name];
    if (!schema) {
      throw new docooment.Error.MissingSchemaError(name);
    }
  }

  // Apply relevant "global" options to the schema
  //if (!('pluralization' in schema.options)) schema.options.pluralization = this.options.pluralization;


  if (!collection) {
    collection = schema.get('collection') || format(name, schema.options);
  }

  var connection = options.connection || this.connection;
  model = Model.compile(name, schema, collection, connection, this);

  if (!skipInit) {
    model.init();
  }

  if (false === options.cache) {
    return model;
  }

  return this.models[name] = model;
}









/**
 * Applies global plugins to `schema`.
 *
 * @param {Schema} schema
 * @api private
 */

Docooment.prototype._applyPlugins = function (schema) {
  for (var i = 0, l = this.plugins.length; i < l; i++) {
    schema.plugin(this.plugins[i][0], this.plugins[i][1]);
  }
}

/**
 * Declares a global plugin executed on all Schemas.
 *
 * Equivalent to calling `.plugin(fn)` on each Schema you create.
 *
 * @param {Function} fn plugin callback
 * @param {Object} [opts] optional options
 * @return {Docooment} this
 * @see plugins ./plugins.html
 * @api public
 */

Docooment.prototype.plugin = function (fn, opts) {
  this.plugins.push([fn, opts]);
  return this;
};

/**
 * The default connection of the docooment module.
 *
 * ####Example:
 *
 *     var docooment = require('docooment');
 *     docooment.connect(...);
 *     docooment.connection.on('error', cb);
 *
 * This is the connection used by default for every model created using [docooment.model](#index_Docooment-model).
 *
 * @property connection
 * @return {Connection}
 * @api public
 */

Docooment.prototype.__defineGetter__('connection', function(){
  return this.connections[0];
});


/**
 * The Docooment Collection constructor
 *
 * @method Collection
 * @api public
 */

Docooment.prototype.Collection = Collection;

/**
 * The Docooment [Connection](#connection_Connection) constructor
 *
 * @method Connection
 * @api public
 */

Docooment.prototype.Connection = Connection;

/**
 * The Docooment version
 *
 * @property version
 * @api public
 */

Docooment.prototype.version = pkg.version;

/**
 * The Docooment constructor
 *
 * The exports of the docooment module is an instance of this class.
 *
 * ####Example:
 *
 *     var docooment = require('docooment');
 *     var docooment2 = new docooment.Docooment();
 *
 * @method Doocument
 * @api public
 */

Docooment.prototype.Docooment = Docooment;

/**
 * The Docooment [Schema](#schema_Schema) constructor
 *
 * ####Example:
 *
 *     var docooment = require('docooment');
 *     var Schema = docooment.Schema;
 *     var CatSchema = new Schema(..);
 *
 * @method Schema
 * @api public
 */

Docooment.prototype.Schema = Schema;

/**
 * The Docooment [SchemaType](#schematype_SchemaType) constructor
 *
 * @method SchemaType
 * @api public
 */

Docooment.prototype.SchemaType = SchemaType;

/**
 * The various Docooment SchemaTypes.
 *
 * @property SchemaTypes
 * @see Schema.SchemaTypes #schema_Schema.Types
 * @api public
 */

Docooment.prototype.SchemaTypes = Schema.Types;

/**
 * The Docooment [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */

Docooment.prototype.VirtualType = VirtualType;

/**
 * The various Docooment Types.
 *
 * ####Example:
 *
 *     var docooment = require('docooment');
 *     var array = docooment.Types.Array;
 *
 * ####Types:
 *
 * - [ObjectId](#types-objectid-js)
 * - [Buffer](#types-buffer-js)
 * - [SubDocument](#types-embedded-js)
 * - [Array](#types-array-js)
 * - [DocumentArray](#types-documentarray-js)
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     var ObjectId = docooment.Types.ObjectId;
 *     var id1 = new ObjectId;
 *
 * @property Types
 * @api public
 */

Docooment.prototype.Types = Types;

/**
 * The Docooment [Query](#query_Query) constructor.
 *
 * @method Query
 * @api public
 */

Docooment.prototype.Query = Query;

/**
 * The Docooment [Promise](#promise_Promise) constructor.
 *
 * @method Promise
 * @api public
 */

//Docooment.prototype.Promise = Promise;

/**
 * The Docooment [Model](#model_Model) constructor.
 *
 * @method Model
 * @api public
 */

Docooment.prototype.Model = Model;

/**
 * The Docooment [Document](#document-js) constructor.
 *
 * @method Document
 * @api public
 */

Docooment.prototype.Document = Document;

/**
 * The [DocoomentError](#error_DocoomentError) constructor.
 *
 * @method Error
 * @api public
 */

Docooment.prototype.Error = require('./error');

/**
 * The [documentdb](https://github.com/Azure/azure-documentdb-node) driver Docooment uses.
 *
 * @property documentdb
 * @api public
 */

Docooment.prototype.docuemntdb = require('documentdb');

var docooment = module.exports = exports = new Docooment;
