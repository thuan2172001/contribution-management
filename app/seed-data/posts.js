import { getCSVFiles, getContentCSVFiles, cleanField } from './scanDataFile';
import Post from '../models/post';

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
      const checkDataExits = await DataSchema.findOne({
        code: fields[header.indexOf('code')],
      });

      if (!checkDataExits) {
        const _data = {
          faculty: fields[header.indexOf('faculty')],
          title: fields[header.indexOf('title')],
          name: fields[header.indexOf('name')],
          date_upload: fields[header.indexOf('date_upload')],
          code: fields[header.indexOf('code')],
          categories: fields[header.indexOf('categories')],
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
