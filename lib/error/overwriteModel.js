
/*!
 * Module dependencies.
 */

var DocoomentError = require('../error.js');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits DocoomentError
 */

function OverwriteModelError (name) {
  DocoomentError.call(this, 'Cannot overwrite `' + name + '` model once compiled.');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'OverwriteModelError';
};

/*!
 * Inherits from DocoomentError.
 */

OverwriteModelError.prototype.__proto__ = DocoomentError.prototype;

/*!
 * exports
 */

module.exports = OverwriteModelError;
