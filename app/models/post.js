const mongoose = require('mongoose');

const { Schema } = mongoose;

const PostSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 254,
    },
    faculty: {
      type: String,
      required: true,
      maxlength: 254,
    },
    title: {
      type: String,
      required: true,
      maxlength: 254,
    },
    categories: {
      type: String,
      required: true,
      maxlength: 254,
    },
    date_upload: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      maxlength: 254,
    },
    file: {
      path: {
        type: String,
      },
      thumbnail: {
        type: String,
      },
      hash: {
        type: String,
      },
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
const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
