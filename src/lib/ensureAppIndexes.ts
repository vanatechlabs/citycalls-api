import { InvoiceModel } from '../modules/finance/invoices.model';
import { ProformaInvoiceModel } from '../modules/finance/proformaInvoices.model';
import { PaymentReceiptModel } from '../modules/finance/paymentReceipts.model';
import { VendorInvoiceModel, VendorPayoutModel } from '../modules/vendors/vendorFinance.model';
import { GatewayPaymentModel } from '../modules/finance/gatewayPayment.model';
import { EstimateSyncModel } from '../modules/finance/estimateSync';
import { NotificationTemplateModel } from '../modules/notifications/notificationTemplates.model';
import { CampaignModel } from '../modules/marketing/campaigns.model';
import { CampaignRecipientModel } from '../modules/marketing/campaignRecipients.model';

export async function ensureAppIndexes() {
  for (const model of [InvoiceModel, ProformaInvoiceModel, PaymentReceiptModel, VendorInvoiceModel, VendorPayoutModel, GatewayPaymentModel, EstimateSyncModel, NotificationTemplateModel, CampaignModel, CampaignRecipientModel]) {
    try { await model.createIndexes(); }
    catch { throw new Error(`Cannot establish integrity indexes for ${model.modelName}. Review duplicates with scripts/checkAppRelease.ts before starting the API.`); }
  }
}
