import {SEED_DATA, VERSION} from '../environment';
import { generateCounter } from './counter';
import SystemInformation from '../models/system_information';
import {generateStudent} from "./students";
const { hashElement } = require('folder-hash');

export const seed = async () => {
  if (SEED_DATA === 'true') {
    const version = VERSION ?? '1';
    const hashSeedFolder = await hashElement('./app/models')
    const systemInformation = await SystemInformation.findOne({version});
    if(!systemInformation){
      await _seed();
      await new SystemInformation({version, seedHash: hashSeedFolder.hash}).save();
    } else if(systemInformation.seedHash !== hashSeedFolder.hash){
      await _seed();
      systemInformation.seedHash = hashSeedFolder.hash;
      await systemInformation.save();
    }
  }
};

const _seed = async () => {
  await generateCounter();
  await generateStudent();
}
