// backend/plugins/tenantPlugin.js
module.exports = function tenantPlugin(schema, options = {}) {
  // 1) tenantId-Feld
  schema.add({
    tenantId: { type: String, required: true, index: true },
  });

  // 2) read-scope: alle finds automatisch auf tenantId einschränken
  function addTenantToFilter(next) {
    const tenantId = this.getOptions()?.tenantId || this.options?.tenantId;
    if (!tenantId) return next(); // In seltenen System-Tasks explizit setzen
    // Merge in existing filter:
    this.setQuery({ ...this.getQuery(), tenantId });
    next();
  }
  schema.pre('find', addTenantToFilter);
  schema.pre('findOne', addTenantToFilter);
  schema.pre('count', addTenantToFilter);
  schema.pre('countDocuments', addTenantToFilter);
  schema.pre('findOneAndUpdate', addTenantToFilter);
  schema.pre('updateMany', addTenantToFilter);
  schema.pre('updateOne', addTenantToFilter);
  schema.pre('deleteMany', addTenantToFilter);
  schema.pre('deleteOne', addTenantToFilter);

  // 3) write-scope: Inserts/Updates erzwingen tenantId
  schema.pre('save', function (next) {
    if (!this.tenantId) {
      // tenantId muss vom Code gesetzt werden (aus req.tenantId)
      return next(new Error('tenantId missing on save'));
    }
    next();
  });
};
