const mongoose = require('mongoose');

const { Schema } = mongoose;

const FacultySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    coordinatorCode: {
      type: String,
      required: true,
    },
    faculty: {
      type: String,
      required: true,
      maxlength: 254,
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
const Faculty = mongoose.model('Faculty', FacultySchema);

module.exports = Faculty;
