
/**
 * DocoomentError constructor
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function DocoomentError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'DocoomentError';
};

/*!
 * Formats error messages
 */

DocoomentError.prototype.formatMessage = function (msg, path, type, val) {
  if (!msg) throw new TypeError('message is required');

  return msg.replace(/{PATH}/, path)
            .replace(/{VALUE}/, String(val||''))
            .replace(/{TYPE}/, type || 'declared type');
}

/*!
 * Inherits from Error.
 */

DocoomentError.prototype.__proto__ = Error.prototype;

/*!
 * Module exports.
 */

module.exports = exports = DocoomentError;

/**
 * The default built-in validator error messages.
 *
 * @see Error.messages #error_messages_DocoomentError-messages
 * @api public
 */

DocoomentError.messages = require('./error/messages');

// backward compat
DocoomentError.Messages = DocoomentError.messages;

/*!
 * Expose subclasses
 */

DocoomentError.CastError = require('./error/cast');
DocoomentError.ValidationError = require('./error/validation')
DocoomentError.ValidatorError = require('./error/validator')
DocoomentError.VersionError =require('./error/version')
DocoomentError.OverwriteModelError = require('./error/overwriteModel')
DocoomentError.MissingSchemaError = require('./error/missingSchema')
DocoomentError.DivergentArrayError = require('./error/divergentArray')

