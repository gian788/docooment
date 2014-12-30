/*!
 * Module dependencies.
 */

var DocoomentError = require('../error.js');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits DocoomentError
 * @api private
 */

function CastError (type, value, path) {
  DocoomentError.call(this, 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
  this.path = path;
};

/*!
 * Inherits from DocoomentError.
 */

CastError.prototype.__proto__ = DocoomentError.prototype;

/*!
 * exports
 */

module.exports = CastError;
