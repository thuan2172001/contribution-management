const mongoose = require('mongoose');

const { Schema } = mongoose;

const PostSchema = new Schema(
  {
    code: {
      type: String,
      required: false,
      unique: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 254,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    date_upload: {
      type: Date,
    },
    status: {
      type: String,
      maxlength: 254,
    },
    image: [{
      path: {
        type: String,
      },
      thumbnail: {
        type: String,
      },
      hash: {
        type: String,
      },
    }],
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
