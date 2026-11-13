import { runEstimateRecovery } from './modules/finance/estimateSync';
import { recoverGatewayPayments } from './modules/finance/gatewayPayments.service';
import { ensureAppIndexes } from './lib/ensureAppIndexes';
import http from 'http';
import { createApp } from './app';
import { connectDb } from './lib/db';
import { loadPermissionCache } from './lib/permissionCache';
import { loadStatusEngineCache } from './lib/statusEngine';
import { initRealtime } from './realtime';
import { startEscalationCheckInterval } from './jobs/escalationCheck';
import { startHappyCallSchedulerInterval } from './jobs/happyCallScheduler';
import { startCampaignSchedulerInterval } from './jobs/campaignScheduler';
import { env } from './config/env';
import { upgradeRegistrationLifecycle } from './modules/registrations/registrationLifecycle.migration';
import { renameMenuAccessKeys } from './modules/users/menuAccessRename.migration';
import { mergeSofaCleaningIntoHomeCleaning } from './modules/websites/city-calls/navbar/sofaCleaningMerge.migration';
import { backfillCustomerProfiles } from './modules/customer-profiles/customerProfile.backfill';
import { cancelDuplicateActiveInvoices } from './modules/finance/duplicateInvoices.repair';

async function main(): Promise<void> {
  await connectDb();
  // Clears old duplicate invoices first, so the one-invoice-per-job index can
  // be built. A failure here is logged, never fatal — same as the indexes.
  await cancelDuplicateActiveInvoices().catch((error) => console.error('[invoices] duplicate repair failed', error));
  await ensureAppIndexes();
  await upgradeRegistrationLifecycle();
  await renameMenuAccessKeys();
  await mergeSofaCleaningIntoHomeCleaning();
  const permissionCount = await loadPermissionCache();
  const transitionCount = await loadStatusEngineCache();

  const app = createApp();
  const httpServer = http.createServer(app);
  initRealtime(httpServer);
  startEscalationCheckInterval();
  startHappyCallSchedulerInterval();
  startCampaignSchedulerInterval();
  const financeRecovery = setInterval(() => { void runEstimateRecovery().catch(error => console.error('[finance-recovery]', error)); }, 30000);
  financeRecovery.unref();
  const gatewayRecovery = setInterval(() => { void recoverGatewayPayments().catch(error => console.error('[gateway-recovery]', error)); }, 60000);
  gatewayRecovery.unref();
  void runEstimateRecovery().catch(error => console.error('[finance-recovery]', error));

  // Customer Section: one-time build of profiles from existing calls /
  // enquiries — in the background, so start-up doesn't wait on it.
  void backfillCustomerProfiles().catch((error) => console.error('[customer-profiles] backfill failed', error));

  httpServer.listen(env.port, () => {
    // ─── Startup Status ───────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🚀  Server      : http://localhost:' + env.port);
    console.log('  🍃  MongoDB     : ✅ Connected');
    console.log('  🔌  Realtime    : ✅ Socket.IO active');
    console.log('  🔐  Permissions : ✅ ' + permissionCount + ' entries loaded');
    console.log('  🔁  Status Engine: ✅ ' + transitionCount + ' transitions loaded');

    if (env.cloudinary.enabled) {
      console.log('  ☁️   Cloudinary  : ✅ Connected (' + (env.cloudinary.cloudName || 'Active') + ')');
    } else {
      console.log('  ☁️   Cloudinary  : ❌ Not Configured');
    }

    console.log(`  🌱  Environment : ${env.nodeEnv}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
