function applyBaseSchemaTransforms(schema, options = {}) {
  if (!schema) return;
  schema.set('timestamps', options.timestamps || false);
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      if (ret._id) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      if (ret.passwordHash) {
        delete ret.passwordHash;
      }
      return ret;
    },
  });
}

module.exports = { applyBaseSchemaTransforms }; 