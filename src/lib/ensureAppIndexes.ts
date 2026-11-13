import { InvoiceModel } from '../modules/finance/invoices.model';
import { ProformaInvoiceModel } from '../modules/finance/proformaInvoices.model';
import { PaymentReceiptModel } from '../modules/finance/paymentReceipts.model';
import { VendorInvoiceModel, VendorPayoutModel } from '../modules/vendors/vendorFinance.model';
import { GatewayPaymentModel } from '../modules/finance/gatewayPayment.model';
import { EstimateSyncModel } from '../modules/finance/estimateSync';

export async function ensureAppIndexes() {
  for (const model of [InvoiceModel, ProformaInvoiceModel, PaymentReceiptModel, VendorInvoiceModel, VendorPayoutModel, GatewayPaymentModel, EstimateSyncModel]) {
    try { await model.createIndexes(); }
    catch { throw new Error(`Cannot establish integrity indexes for ${model.modelName}. Review duplicates with scripts/checkAppRelease.ts before starting the API.`); }
  }
}
