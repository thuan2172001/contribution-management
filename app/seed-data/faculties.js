import { getCSVFiles, getContentCSVFiles, cleanField } from './scanDataFile';
import Faculty from '../models/faculty';

const Promise = require('bluebird');

export const generateFaculty = async () => {
  try {
    const DataSchema = Faculty;
    const generateNumber = await DataSchema.count();

    if (generateNumber > 0) return;
    const fileData = await getCSVFiles('faculty');

    const { header, content } = await getContentCSVFiles(fileData[0]);

    await Promise.each(content, async (line) => {
      const fields = cleanField(line.split(','));
      const checkDataExits = await DataSchema.findOne({
        code: fields[header.indexOf('code')],
      });

      if (!checkDataExits) {
        const _data = {
          faculty: fields[header.indexOf('faculty')],
          coordinatorCode: fields[header.indexOf('coordinatorCode')],
          code: fields[header.indexOf('code')],
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
