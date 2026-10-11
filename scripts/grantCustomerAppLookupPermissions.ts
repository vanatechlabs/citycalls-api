import '../src/config/env';
import mongoose from 'mongoose';
import { RolePermissionModel } from '../src/modules/config/rolePermissions.model';

const ROLES = [
  'TEAM_LEAD',
  'EMPLOYEE',
  'TECHNICIAN',
  'VENDOR_OWNER',
  'VENDOR_MANAGER',
  'VENDOR_TECHNICIAN',
  'CUSTOMER',
  'BUSINESS_CUSTOMER',
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  let upserted = 0;
  for (const role of ROLES) {
    await RolePermissionModel.findOneAndUpdate(
      { role, module: 'config', action: 'view' },
      { role, module: 'config', action: 'view', dataScope: 'ALL' },
      { upsert: true, new: true }
    );
    upserted++;
  }

  console.log(`[grant-customer-app-lookup-permissions] config.view grants upserted: ${upserted}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
