import { getNextSequence } from '../api/library/getNextCounter';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const StudentSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
      fullName: {
          type: String,
          required: true,
          maxlength: 254,
      },
      email: {
        type: String,
        maxlength: 254,
      },
      gender: {
        type: String, // 0 : female, 1: male
      },
      birthDay: {
        type: Date,
      },
  },
  { timestamps: true },
);

// StudentSchema.pre('validate', async function () {
//   if (!this.code) {
//     const nextSeq = await getNextSequence('students');
//     this.code = nextSeq;
//   }
// });
const Student = mongoose.model('Student', StudentSchema);

module.exports = Student;
