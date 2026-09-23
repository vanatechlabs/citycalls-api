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

async function main(): Promise<void> {
  await connectDb();
  const permissionCount = await loadPermissionCache();
  const transitionCount = await loadStatusEngineCache();

  const app = createApp();
  const httpServer = http.createServer(app);
  initRealtime(httpServer);
  startEscalationCheckInterval();
  startHappyCallSchedulerInterval();
  startCampaignSchedulerInterval();

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
