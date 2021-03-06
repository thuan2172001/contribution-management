import Promise from 'bluebird';
import Counter from '../models/counter';

export const generateCounter = async () => {
  try {
    const seedField = ['agency', 'customers', 'customerorders',
      'exportorders', 'importorders', 'managementunit', 'packing',
      'planting', 'seeding', 'shippingorders', 'species', 'storelevel', 'users',
      'productplancleanings', 'productplanharvestings', 'productplanpackings', 'productplanpreliminarytreatments', 'productplanpreserves',
    ];
    await Promise.each(seedField, async (field) => {
      const isExists = await Counter.findOne({ name: field });
      if (!isExists) {
        await new Counter({
          name: field,
          seq: 0,
        }).save();
      }
    });
    console.log('Seed Couter Success');
  } catch (err) {
    throw new Error(err.message);
  }
};
