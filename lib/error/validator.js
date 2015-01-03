/*!
 * Module dependencies.
 */

var DocoomentError = require('../error.js');
var errorMessages = DocoomentError.messages;

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @param {String|Number|any} val
 * @inherits DocoomentError
 * @api private
 */

function ValidatorError (path, msg, type, val) {
  if (!msg) msg = errorMessages.general.default;
  var message = this.formatMessage(msg, path, type, val);
  DocoomentError.call(this, message);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
};

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  return this.message;
}

/*!
 * Inherits from DocoomentError
 */

ValidatorError.prototype.__proto__ = DocoomentError.prototype;

/*!
 * exports
 */

module.exports = ValidatorError;
