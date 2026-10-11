import '../src/config/env';
import mongoose from 'mongoose';
import { MasterModel } from '../src/modules/config/master.model';
import { BranchModel, SubBranchModel } from '../src/modules/organization/organization.model';
import { BRANCH_SEED_DATA } from './seedOrganizationData';

const TARGET_BRANCH_CODES = ['DELCS', 'DELNE', 'DELW', 'GZB'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const serviceCategoryIds = (await MasterModel.find({ masterType: 'SERVICE_CATEGORY', active: true }).select('_id')).map(
    (master) => master._id
  );

  let branchCount = 0;
  let subBranchCount = 0;
  let pinCount = 0;
  const activeBranchIds: mongoose.Types.ObjectId[] = [];
  const activeSubBranchCodes: string[] = [];

  for (const seed of BRANCH_SEED_DATA.filter((branch) => TARGET_BRANCH_CODES.includes(branch.code))) {
    const pinCodes = [...new Set(seed.subBranches.flatMap((subBranch) => subBranch.pinCodes))].sort();
    const branch = await BranchModel.findOneAndUpdate(
      { code: seed.code },
      {
        $set: {
          name: seed.name,
          coverage: {
            pinCodes,
            cities: seed.cities,
            states: seed.states,
          },
          serviceCategoryIds,
          active: true,
        },
      },
      { upsert: true, new: true }
    );

    branchCount++;
    pinCount += pinCodes.length;
    activeBranchIds.push(branch._id);

    for (const subBranch of seed.subBranches) {
      activeSubBranchCodes.push(subBranch.code);
      await SubBranchModel.findOneAndUpdate(
        { code: subBranch.code },
        {
          $set: {
            branchId: branch._id,
            name: subBranch.name,
            coverage: { pinCodes: [...new Set(subBranch.pinCodes)].sort() },
            active: true,
          },
        },
        { upsert: true }
      );
      subBranchCount++;
    }
  }

  const deactivated = await SubBranchModel.updateMany(
    {
      branchId: { $in: activeBranchIds },
      code: { $nin: activeSubBranchCodes },
    },
    { $set: { active: false } }
  );

  console.log(`[seed-delhi-ghaziabad-coverage] branches upserted: ${branchCount}`);
  console.log(`[seed-delhi-ghaziabad-coverage] sub-branches upserted: ${subBranchCount}`);
  console.log(`[seed-delhi-ghaziabad-coverage] old sub-branches deactivated: ${deactivated.modifiedCount}`);
  console.log(`[seed-delhi-ghaziabad-coverage] branch pin-code entries covered: ${pinCount}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
