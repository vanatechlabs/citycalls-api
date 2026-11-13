import { InvoiceModel } from '../modules/finance/invoices.model';
import { ProformaInvoiceModel } from '../modules/finance/proformaInvoices.model';
import { PaymentReceiptModel } from '../modules/finance/paymentReceipts.model';
import { VendorInvoiceModel, VendorPayoutModel } from '../modules/vendors/vendorFinance.model';
import { GatewayPaymentModel } from '../modules/finance/gatewayPayment.model';
import { EstimateSyncModel } from '../modules/finance/estimateSync';
import { NotificationTemplateModel } from '../modules/notifications/notificationTemplates.model';
import { CampaignModel } from '../modules/marketing/campaigns.model';
import { CampaignRecipientModel } from '../modules/marketing/campaignRecipients.model';

// Builds the unique indexes the finance/campaign code relies on. A collection
// whose existing data breaks one of them (duplicates, or an older index on the
// same field) used to stop the API at every start, and the proxy returned 503
// for everything. It now logs the real MongoDB error and starts anyway — those
// collections just run without that guard until the data is fixed and the API
// restarted. Set REQUIRE_APP_INDEXES=true to refuse to start instead.
export async function ensureAppIndexes() {
  const failed: string[] = [];
  for (const model of [InvoiceModel, ProformaInvoiceModel, PaymentReceiptModel, VendorInvoiceModel, VendorPayoutModel, GatewayPaymentModel, EstimateSyncModel, NotificationTemplateModel, CampaignModel, CampaignRecipientModel]) {
    try {
      await model.createIndexes();
    } catch (error) {
      failed.push(model.modelName);
      console.error(
        `[indexes] ⚠️  Could not build integrity indexes for ${model.modelName}: ` +
          `${error instanceof Error ? error.message : String(error)} — review duplicates with scripts/checkAppRelease.ts.`
      );
    }
  }
  if (failed.length && process.env.REQUIRE_APP_INDEXES === 'true') {
    throw new Error(`Cannot establish integrity indexes for ${failed.join(', ')}. Review duplicates with scripts/checkAppRelease.ts before starting the API.`);
  }
}
