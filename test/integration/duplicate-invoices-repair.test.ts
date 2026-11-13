import { Types } from 'mongoose';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../setup/testDb';
import { InvoiceModel } from '../../src/modules/finance/invoices.model';
import { PaymentReceiptModel } from '../../src/modules/finance/paymentReceipts.model';
import { GatewayPaymentModel } from '../../src/modules/finance/gatewayPayment.model';
import { ActivityLogModel } from '../../src/modules/audit/activityLog.model';
import { cancelDuplicateActiveInvoices } from '../../src/modules/finance/duplicateInvoices.repair';

// Standalone MongoDB on purpose — production is one (see lib/db.ts), and the
// repair must work without transactions.
describe('cancelDuplicateActiveInvoices', () => {
  jest.setTimeout(60000);
  const customerId = new Types.ObjectId();
  const branchId = new Types.ObjectId();
  let seq = 0;

  beforeAll(async () => {
    await connectTestDb();
  });
  afterAll(disconnectTestDb);

  // Production state: duplicates already in the collection, so the
  // one_active_invoice_per_job index could never be built.
  beforeEach(async () => {
    await clearTestDb();
    await InvoiceModel.init();
    await InvoiceModel.collection.dropIndex('one_active_invoice_per_job').catch(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  async function invoice(
    serviceRequestId: Types.ObjectId,
    fields: { status?: string; amountPaid?: number; sentVia?: string[]; minutesAgo?: number } = {}
  ) {
    const _id = new Types.ObjectId();
    const createdAt = new Date(Date.now() - (fields.minutesAgo ?? 0) * 60000);
    await InvoiceModel.collection.insertOne({
      _id,
      number: `INV-${++seq}`,
      serviceRequestId,
      customerId,
      branchId,
      financialYear: '2026-27',
      items: [],
      subtotal: 500,
      total: 500,
      discount: 0,
      roundOff: 0,
      amountPaid: fields.amountPaid ?? 0,
      sentVia: fields.sentVia ?? [],
      estimateIds: [],
      status: fields.status ?? 'ISSUED',
      createdAt,
      updatedAt: createdAt,
    });
    return _id;
  }

  const statusOf = async (id: Types.ObjectId) => (await InvoiceModel.findById(id).lean())?.status;

  it('keeps one invoice per job, cancels the unpaid extras, and lets the index build', async () => {
    // Job A: two unpaid issued invoices — the one the customer was sent stays.
    const jobA = new Types.ObjectId();
    const aSent = await invoice(jobA, { sentVia: ['WHATSAPP'], minutesAgo: 60 });
    const aNewer = await invoice(jobA, { minutesAgo: 5 });
    // Job B: a paid invoice (with a receipt) and an unpaid duplicate.
    const jobB = new Types.ObjectId();
    const bUnpaid = await invoice(jobB, { minutesAgo: 1 });
    const bPaid = await invoice(jobB, { status: 'PAID', amountPaid: 500, minutesAgo: 30 });
    await PaymentReceiptModel.collection.insertOne({ invoiceId: bPaid, number: 'RCPT-1', amount: 500 });
    // Job C: a draft with an online-payment attempt beats an issued one.
    const jobC = new Types.ObjectId();
    const cGateway = await invoice(jobC, { status: 'DRAFT', minutesAgo: 20 });
    const cIssued = await invoice(jobC, { minutesAgo: 2 });
    await GatewayPaymentModel.collection.insertOne({ invoiceId: cGateway, orderId: 'order_1', status: 'PENDING' });
    // Job D: a single invoice — nothing to do.
    const single = await invoice(new Types.ObjectId());

    await cancelDuplicateActiveInvoices();

    expect(await statusOf(aSent)).toBe('ISSUED');
    expect(await statusOf(aNewer)).toBe('CANCELLED');
    expect(await statusOf(bPaid)).toBe('PAID');
    expect(await statusOf(bUnpaid)).toBe('CANCELLED');
    expect(await statusOf(cGateway)).toBe('DRAFT');
    expect(await statusOf(cIssued)).toBe('CANCELLED');
    expect(await statusOf(single)).toBe('ISSUED');

    const cancelledA = await InvoiceModel.findById(aNewer).lean();
    expect(cancelledA?.cancelReason).toContain('INV-1 kept');
    expect(cancelledA?.cancelledAt).toBeInstanceOf(Date);
    const logs = await ActivityLogModel.find({ entityType: 'INVOICE', action: 'CANCELLED' }).lean();
    expect(logs.map((l) => String(l.entityId)).sort()).toEqual([aNewer, bUnpaid, cIssued].map(String).sort());
    expect(logs.every((l) => l.userRole === 'SYSTEM' && !l.userId)).toBe(true);

    // The point of the repair: the unique index can now be built.
    await expect(InvoiceModel.createIndexes()).resolves.not.toThrow();
  });

  it('leaves a job alone when more than one of its invoices has money', async () => {
    const job = new Types.ObjectId();
    const first = await invoice(job, { status: 'PARTIALLY_PAID', amountPaid: 200 });
    const second = await invoice(job, { status: 'PAID', amountPaid: 500 });

    await cancelDuplicateActiveInvoices();

    expect(await statusOf(first)).toBe('PARTIALLY_PAID');
    expect(await statusOf(second)).toBe('PAID');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(String(job)));
  });

  it('does nothing when every job has at most one active invoice', async () => {
    const job = new Types.ObjectId();
    const active = await invoice(job);
    const old = await invoice(job, { status: 'CANCELLED' });

    await cancelDuplicateActiveInvoices();

    expect(await statusOf(active)).toBe('ISSUED');
    expect(await statusOf(old)).toBe('CANCELLED');
    expect(await ActivityLogModel.countDocuments()).toBe(0);
  });
});
