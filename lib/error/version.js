
/*!
 * Module dependencies.
 */

var DocoomentError = require('../error.js');

/**
 * Version Error constructor.
 *
 * @inherits DocoomentError
 * @api private
 */

function VersionError () {
  DocoomentError.call(this, 'No matching document found.');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'VersionError';
};

/*!
 * Inherits from DocoomentError.
 */

VersionError.prototype.__proto__ = DocoomentError.prototype;

/*!
 * exports
 */

module.exports = VersionError;
