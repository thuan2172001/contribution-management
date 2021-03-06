import { getNextSequence } from '../api/library/getNextCounter';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    // publicKey: {
    //   type: String,
    // },
    // encryptedPrivateKey: {
    //   type: String,
    // },
    // issuerSignature: {
    //   type: String,
    // },
    // issuedPublicKey: {
    //   type: String,
    // },
    // tempPassword: {
    //   type: String,
    // },
    fullName: {
      type: String,
      required: true,
      maxlength: 254,
    },
    // email: {
    //   type: String,
    //   maxlength: 254,
    // },
    // gender: {
    //   type: String, // 0 : female, 1: male
    // },
    // birthDay: {
    //   type: Date,
    // },
    // address: {
    //   address: {
    //     type: String,
    //     maxlength: 255,
    //   },
    //   city: {
    //     type: String,
    //     maxlength: 255,
    //   },
    //   district: {
    //     type: String,
    //     maxlength: 255,
    //   },
    //   state: {
    //     type: String,
    //     maxlength: 255,
    //   },
    // },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);
CustomerSchema.pre('validate', async function () {
  if (!this.code) {
    const nextSeq = await getNextSequence('customers');
    this.code = nextSeq;
  }
});
const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer;
