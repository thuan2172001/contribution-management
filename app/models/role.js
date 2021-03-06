const mongoose = require('mongoose');

const { Schema } = mongoose;

const RoleSchema = new Schema(
  {
    name: {
      type: String,
    },
    code: {
      type: String,
    },
    agency: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
    },
    level: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String, // 0: disable, 1 : enable
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    managementUnit: {
      type: Schema.Types.ObjectId,
      ref: 'ManagementUnit',
    },
    scopes: [{
      type: String,
    }],
  },
  { timestamps: true },
);

const Role = mongoose.model('Role', RoleSchema);
module.exports = Role;
