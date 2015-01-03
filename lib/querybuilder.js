/*!
 * Module dependencies.
 */

var utils = require('./utils');

function Query(criteria, options){
	if (!(this instanceof Query))
   	return new Query(criteria, options);

  	var proto = this.constructor.prototype;

  this.op = proto.op || undefined;

  this.options = {};
  this.setOptions(proto.options);

  this._conditions = proto._conditions
    ? utils.clone(proto._conditions)
    : {};

  this._fields = proto._fields
    ? utils.clone(proto._fields)
    : undefined;

  this._update = proto._update
    ? utils.clone(proto._update)
    : undefined;

  this._path = proto._path || undefined;
  this._distinct = proto._distinct || undefined;
  this._collection = proto._collection || undefined;

  if (options) {
    this.setOptions(options);
  }

  if (criteria) {
    if (criteria.find && criteria.remove && criteria.update) {
      // quack quack!
      this.collection(criteria);
    } else {
      this.find(criteria);
    }
  }
}

/**
 * Sets query options.
 *
 * ####Options:
 *
 * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D) *
 * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D) *
 * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D) *
 * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D) *
 * - collection the collection to query against
 *
 * @param {Object} options
 * @api public
 */

Query.prototype.setOptions = function (options) {
  if (!(options && utils.isObject(options)))
    return this;

  // set arbitrary options
  var methods = utils.keys(options),
    	method;

  for (var i = 0; i < methods.length; ++i) {
    method = methods[i];

    // use methods if exist (safer option manipulation)
    if ('function' == typeof this[method]) {
      var args = utils.isArray(options[method])
        ? options[method]
        : [options[method]];
      this[method].apply(this, args)
    } else {
      this.options[method] = options[method];
    }
  }

  return this;
}

/**
 * Sets this Querys collection.
 *
 * @param {Collection} coll
 * @return {Query} this
 */

Query.prototype.collection = function collection (coll) {
  this._collection = new Query.Collection(coll);

  return this;
}

/**
 * Specifies a `$where` condition
 *
 * Use `$where` when you need to select documents using a JavaScript expression.
 *
 * ####Example
 *
 *     query.$where('this.comments.length > 10 || this.name.length > 5')
 *
 *     query.$where(function () {
 *       return this.comments.length > 10 || this.name.length > 5;
 *     })
 *
 * @param {String|Function} js javascript string or function
 * @return {Query} this
 * @memberOf Query
 * @method $where
 * @api public
 */

Query.prototype.$where = function (js) {
  this._conditions.$where = js;
  return this;
}

/**
 * Specifies a `path` for use with chaining.
 *
 * ####Example
 *
 *     // instead of writing:
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 *
 *     // we can instead write:
 *     User.where('age').gte(21).lte(65);
 *
 *     // passing query conditions is permitted
 *     User.find().where({ name: 'vonderful' })
 *
 *     // chaining
 *     User
 *     .where('age').gte(21).lte(65)
 *     .where('name', /^vonderful/i)
 *     .where('friends').slice(10)
 *     .exec(callback)
 *
 * @param {String} [path]
 * @param {Object} [val]
 * @return {Query} this
 * @api public
 */

Query.prototype.where = function () {
  if (!arguments.length) return this;
  if (!this.op) this.op = 'find';

  var type = typeof arguments[0];

  if ('string' == type) {
    this._path = arguments[0];

    if (2 === arguments.length) {
      this._conditions[this._path] = arguments[1];
    }

    return this;
  }

  if ('object' == type && !Array.isArray(arguments[0])) {
    return this.merge(arguments[0]);
  }

  throw new TypeError('path must be a string or object');
}	





Query.prototype.find = function(){
	//console.log(arguments)
}



/**
 * Determines if `conds` can be merged using `querybuilder().merge()`
 *
 * @param {Object} conds
 * @return {Boolean}
 */

Query.canMerge = function (conds) {
  return conds instanceof Query || utils.isObject(conds);
}

/**
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * @param {Query|Object} source
 * @return {Query} this
 */

Query.prototype.merge = function (source) {
  	if (!source)
    	return this;

  	if (!Query.canMerge(source))
    	throw new TypeError('Invalid argument. Expected instanceof mquery or plain object');

  	if (source instanceof Query) {
   // if source has a feature, apply it to ourselves

   	if (source._conditions) {
      	utils.merge(this._conditions, source._conditions);
    	}

   	if (source._fields) {
      	this._fields || (this._fields = {});
      	utils.merge(this._fields, source._fields);
    	}

   	if (source.options) {
      	this.options || (this.options = {});
      	utils.merge(this.options, source.options);
    	}

    	if (source._update) {
      	this._update || (this._update = {});
      	utils.mergeClone(this._update, source._update);
    	}

    	if (source._distinct) {
      	this._distinct = source._distinct;
    	}

    	return this;
  	}

  	// plain object
  	utils.merge(this._conditions, source);

  	return this;
}


module.exports = QueryBuilder;
