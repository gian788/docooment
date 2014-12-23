
/*!
 * Module dependencies.
 */

var DocoomentError = require('../error.js');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits DocoomentError
 */

function MissingSchemaError (name) {
  var msg = 'Schema hasn\'t been registered for model "' + name + '".\n'
          + 'Use Docooment.model(name, schema)';
  DocoomentError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'MissingSchemaError';
};

/*!
 * Inherits from DocoomentError.
 */

MissingSchemaError.prototype.__proto__ = DocoomentError.prototype;

/*!
 * exports
 */

module.exports = MissingSchemaError;
