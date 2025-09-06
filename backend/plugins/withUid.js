// backend/models/plugins/withUid.js
const { customAlphabet } = require('nanoid');
const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

/**
 * withUid({ field='uid', prefix='' })
 * - fügt ein eindeutiges String-Feld hinzu
 * - generiert automatisch vor validate()
 */
module.exports = function withUid({ field = 'uid', prefix = '' } = {}) {
  return function apply(schema) {
    schema.add({ [field]: { type: String, unique: true, index: true, required: true } });
    schema.pre('validate', function (next) {
      if (!this[field]) this[field] = prefix + nano();
      next();
    });
  };
};
