import { getCSVFiles, getContentCSVFiles, cleanField } from './scanDataFile';
import Post from '../models/post';
import Category from '../models/category';
import Student from '../models/student';

const Promise = require('bluebird');

export const generatePost = async () => {
  try {
    const DataSchema = Post;
    const generateNumber = await DataSchema.count();

    if (generateNumber > 0) return;
    const fileData = await getCSVFiles('post');

    const { header, content } = await getContentCSVFiles(fileData[0]);

    await Promise.each(content, async (line) => {
      const fields = cleanField(line.split(','));
      const categoryCode = fields[header.indexOf('category')];
      const category = await Category.findOne({ code: categoryCode });
      const studentCode = fields[header.indexOf('student')];
      const student = await Student.findOne({ code: studentCode });

      const checkDataExits = await DataSchema.findOne({
        code: fields[header.indexOf('code')],
      });

      if (!checkDataExits) {
        const _data = {
          title: fields[header.indexOf('title')],
          student,
          date_upload: fields[header.indexOf('date_upload')],
          code: fields[header.indexOf('code')],
          category,
          status: fields[header.indexOf('status')],
          file: fields[header.indexOf('file')],
        };
        const data = new DataSchema(_data);

        await data.save();
      }
    });
  } catch
  (err) {
    throw new Error(err.message);
  }
};
