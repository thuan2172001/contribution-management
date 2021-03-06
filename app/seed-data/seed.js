import { generateAgency } from './agency';
import { generateShippingAgency } from './shippingagencies';
import { createDefaultUser, createAgencyForUser, createShippingAgencyForUser } from './user_default';
import { generateSpecies } from './species';
import { generateLandLot } from './land_lot';
import { generatePacking } from './packing';
import { generateStoreLevel } from './store_level';
import { generateCustomer } from './customers';
import { generateCustomerOrder } from './customerorders';
import { generatePlanting } from './planting';
import { generateSeeding } from './seeding';
import { generateProductPlanAdmin } from './product_plan_admin';
import { generateProductPlanCleaning } from './product_plan_cleaning';
import { generateProductPlanHarvesting } from './product_plan_harvesting';
import { generateProductPlanPacking } from './product_plan_packing';
import { generateProductPlanPreliminaryTreatment } from './product_plan_preliminary_treatment';
import { generateProductPlanPreserve } from './product_plan_preserve';
import { generateProductPlan } from './product_plan';
import { generateRole } from './role';
import { generateSystemFunction } from './system_function';
import { generateQRCode, generateQRCodeActive, generateQRCodePack } from './qrcode';
import { generateManagementUnit, generateManagementUnitForUser } from './management_unit';
import { generateNotification } from './notification';
import { generateExportOrder } from './export_order';
import {SEED_DATA, VERSION} from '../environment';
import { generateCounter } from './counter';
import SystemInformation from '../models/system_information';
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

  // console.log({ seed: SEED_DATA });
  // if (SEED_DATA === 'true') {
  //   await generateStoreLevel();
  //   await generateManagementUnitForUser();
  //   await generateSpecies();
  //   await generateLandLot();
  //   await generateSeeding();
  //   await generatePacking();
  //   await generateProductPlanCleaning();
  //   await generateProductPlanHarvesting();
  //   await generateProductPlanPacking();
  //   await generateProductPlanPreliminaryTreatment();
  //   await generateProductPlanPreserve();
  //   await generateProductPlanAdmin();
  //   await generateQRCode();
  //   await generateQRCodeActive();
  //   await generateQRCodePack();
  //   await generateShippingAgency();
  //   await generateSystemFunction();
  //   await generateCustomer();
  //   await generateCustomerOrder();
  //   await createAgencyUser();
  //   await generateExportOrder();
  // }
};

const _seed = async () => {
  await generateCounter();
  await generateManagementUnit();
  await generateCustomer();
  await generateRole();
  await generateSpecies();
  await generatePacking();
  await generateLandLot();
  await generateStoreLevel();
  await createDefaultUser();
  await generatePlanting();
  await generateSeeding();
  await generateAgency();
  await generateShippingAgency();
  await createAgencyForUser();
  // await createShippingAgencyForUser();
  await generateCustomerOrder();
  await generateProductPlan();
  // await generateNotification();
}
