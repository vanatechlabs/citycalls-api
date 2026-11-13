import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MasterModel } from '../../src/modules/config/master.model';
import { ServiceModel } from '../../src/modules/catalog/catalog.model';
import { CustomerModel } from '../../src/modules/customers/customers.model';
import { BranchModel } from '../../src/modules/organization/organization.model';
import { ServiceRequestModel } from '../../src/modules/service-requests/serviceRequests.model';
import { ServiceVisitModel } from '../../src/modules/field-execution/serviceVisits.model';
import { InvoiceModel } from '../../src/modules/finance/invoices.model';
import { ProformaInvoiceModel } from '../../src/modules/finance/proformaInvoices.model';
import { PaymentReceiptModel } from '../../src/modules/finance/paymentReceipts.model';
import { OtpModel } from '../../src/modules/auth/otp.model';
import { quoteService } from '../../src/modules/catalog/servicePricing';
import { createServiceRequest, updateStatus, verifyCompletionOtp } from '../../src/modules/service-requests/serviceRequests.service';
import { completeVisit, processSyncBatch } from '../../src/modules/field-execution/serviceVisits.service';
import { getProformaInvoice, acceptProformaInvoice, listProformaInvoices } from '../../src/modules/finance/proformaInvoices.service';
import { recordPayment } from '../../src/modules/finance/payments.service';
import { createDirectInvoice } from '../../src/modules/finance/invoices.service';
import { getEstimate } from '../../src/modules/finance/estimates.service';
import { EstimateModel } from '../../src/modules/finance/estimates.model';
import { AccessTokenPayload } from '../../src/lib/jwt';
import { indiaDayRange } from '../../src/lib/indiaDate';
import { VendorModel } from '../../src/modules/vendors/vendors.model';
import { VendorInvoiceModel, VendorPayoutModel } from '../../src/modules/vendors/vendorFinance.model';
import { createVendorPayout, approveVendorInvoice, markPayoutPaid } from '../../src/modules/vendors/vendorFinance.service';
import { convertEstimateToProforma } from '../../src/modules/finance/proformaInvoices.service';
import { convertProformaToInvoice } from '../../src/modules/finance/invoices.service';

jest.mock('../../src/lib/notifications', () => ({ trigger: jest.fn(async () => undefined) }));
jest.mock('../../src/lib/auditLog', () => ({ logActivity: jest.fn(async () => undefined) }));
jest.mock('../../src/realtime', () => ({ emitServiceRequestStatusChanged: jest.fn(), emitServiceRequestAssigned: jest.fn(), emitTechnicianLocationUpdated: jest.fn() }));
jest.mock('../../src/lib/pdfGenerator', () => ({ generateDocumentPdf: jest.fn(async () => '/receipt.pdf') }));
jest.mock('../../src/lib/permissionCache', () => ({ getDataScope: (role: string) => role === 'SUPER_ADMIN' ? 'ALL' : 'OWN' }));
jest.mock('../../src/lib/statusEngine', () => ({ assertValidTransition: jest.fn(), getAllowedTransitions: () => [] }));
jest.mock('../../src/lib/numbering', () => { let n = 0; return { getNextNumber: async () => `TEST-${++n}`, currentFinancialYear: () => '2026-27' }; });

describe('App pricing and safety contracts against transactional MongoDB', () => {
  jest.setTimeout(120000);
  let db: MongoMemoryReplSet;
  const admin: AccessTokenPayload = { sub: new Types.ObjectId().toString(), role: 'SUPER_ADMIN' };
  const customerActor: AccessTokenPayload = { sub: new Types.ObjectId().toString(), role: 'CUSTOMER' };
  let customer: InstanceType<typeof CustomerModel>;
  let branch: InstanceType<typeof BranchModel>;
  let fixed: InstanceType<typeof ServiceModel>;
  let hourly: InstanceType<typeof ServiceModel>;
  let repair: InstanceType<typeof ServiceModel>;
  const address = { line1: 'Test address', city: 'Delhi', state: 'Delhi', pinCode: '110001', country: 'India' };

  beforeAll(async () => {
    db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(db.getUri());
    await Promise.all([InvoiceModel.init(), PaymentReceiptModel.init(), ServiceRequestModel.init(), ProformaInvoiceModel.init(), VendorInvoiceModel.init(), VendorPayoutModel.init()]);
  });
  afterAll(async () => { await mongoose.disconnect(); await db?.stop(); });
  beforeEach(async () => {
    for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
    customer = await CustomerModel.create({ name: 'Customer', userId: customerActor.sub, contacts: [{ mobile: '9000000001', isPrimary: true }] });
    const [normal, help, appliance] = await MasterModel.create([
      { masterType: 'SERVICE_CATEGORY', key: 'BEAUTY_SALOON', label: 'Salon' },
      { masterType: 'SERVICE_CATEGORY', key: 'HELP_NOW', label: 'Help Now' },
      { masterType: 'SERVICE_CATEGORY', key: 'HOME_APPLIANCES', label: 'Home Appliances' },
    ]);
    branch = await BranchModel.create({ name: 'Branch', code: 'TEST', active: true, dailyCapacityPerSlot: 1, coverage: { pinCodes: ['110001'] }, serviceCategoryIds: [normal._id, help._id, appliance._id], registeredAddress: { state: 'Delhi' } });
    fixed = await ServiceModel.create({ name: 'Fixed service', categoryId: normal._id, active: true, pricing: { basePrice: 250, mode: 'HOURLY' } });
    hourly = await ServiceModel.create({ name: 'Hourly help', categoryId: help._id, active: true, pricing: { basePrice: 150, hourlyRate: 200, mode: 'HOURLY' } });
    repair = await ServiceModel.create({ name: 'Repair', categoryId: appliance._id, active: true, pricing: { basePrice: 999, visitingCharge: 50, inspectionCharge: 100 } });
  });
  async function job(service = fixed, extra: Record<string, unknown> = {}) {
    return ServiceRequestModel.create({ number: new Types.ObjectId().toString(), customerId: customer._id, branchId: branch._id, serviceId: service._id, addressSnapshot: address, source: 'CUSTOMER_APP', createdBy: admin.sub, status: 'WORK_IN_PROGRESS', bookingPrice: await quoteService(service), ...extra });
  }
  async function invoice(serviceRequestId?: Types.ObjectId) {
    return InvoiceModel.create({ number: new Types.ObjectId().toString(), customerId: customer._id, branchId: branch._id, serviceRequestId, financialYear: '2026-27', items: [{ description: 'Service', qty: 1, unitPrice: 250, lineTotal: 250 }], subtotal: 250, total: 250, status: 'ISSUED' });
  }

  it('forces non-HelpNow services to fixed pricing', async () => {
    expect(await quoteService(fixed, { hours: 4, helpers: 3 })).toMatchObject({ mode: 'FIXED', total: 250, hours: 1, helpers: 1 });
  });
  it('calculates booked hours per helper and supports fixed HelpNow', async () => {
    expect(await quoteService(hourly, { hours: 3, helpers: 2 })).toMatchObject({ mode: 'HOURLY', total: 1200 });
    hourly.pricing.mode = 'FIXED';
    expect(await quoteService(hourly, { hours: 3, helpers: 2 })).toMatchObject({ mode: 'FIXED', total: 150 });
  });
  it('quotes only inspection/visit charges for appliance repair', async () => {
    expect(await quoteService(repair)).toMatchObject({ mode: 'ESTIMATE', total: 150 });
  });
  it('rejects out-of-range hourly plans and unpublished prices', async () => {
    await expect(quoteService(hourly, { hours: 17 })).rejects.toThrow();
    fixed.pricing.basePrice = 0;
    await expect(quoteService(fixed)).rejects.toThrow('needs a price');
  });
  it('rejects inactive services and stale displayed prices on booking', async () => {
    await expect(createServiceRequest({ serviceId: fixed.id, customerId: customer.id, addressSnapshot: address, source: 'CUSTOMER_APP', expectedTotal: 1 }, customerActor)).rejects.toThrow('price changed');
    fixed.active = false; await fixed.save();
    await expect(createServiceRequest({ serviceId: fixed.id, customerId: customer.id, addressSnapshot: address, source: 'CUSTOMER_APP' }, customerActor)).rejects.toThrow('Active service');
  });
  it('persists a price that survives subsequent catalog edits', async () => {
    const sr = await createServiceRequest({ serviceId: fixed.id, customerId: customer.id, addressSnapshot: address, source: 'CUSTOMER_APP', expectedTotal: 250 }, customerActor);
    fixed.pricing.basePrice = 999; await fixed.save();
    const bill = await createDirectInvoice({ customerId: customer.id, branchId: branch.id, serviceRequestId: sr.id, items: [{ description: 'Tampered', qty: 1, unitPrice: 1 }] }, admin);
    expect(bill.total).toBe(250);
  });
  it('prevents concurrent bookings from taking the last slot twice', async () => {
    await MasterModel.create({ masterType: 'APPOINTMENT_SLOT', key: 'MORNING', label: 'Morning', active: true });
    const date = new Date(Date.now() + 3 * 86400000);
    const data = { serviceId: fixed.id, customerId: customer.id, addressSnapshot: address, source: 'CUSTOMER_APP', scheduledDate: date, scheduledSlot: 'Morning' };
    const results = await Promise.allSettled([createServiceRequest(data, customerActor), createServiceRequest(data, customerActor)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await ServiceRequestModel.countDocuments()).toBe(1);
  });
  it('blocks customer self-recorded collections before touching any invoice', async () => {
    await expect(recordPayment(new Types.ObjectId().toString(), { idempotencyKey: 'customer-forgery', amount: 250, method: 'CASH' }, customerActor)).rejects.toThrow('Customers cannot');
  });
  it('records duplicate payment retries once and rejects overpayment', async () => {
    const bill = await invoice();
    const input = { idempotencyKey: 'collection-attempt-1', amount: 100, method: 'CASH' as const };
    const first = await recordPayment(bill.id, input, admin);
    const second = await recordPayment(bill.id, input, admin);
    expect(second.id).toBe(first.id);
    expect((await InvoiceModel.findById(bill.id))!.amountPaid).toBe(100);
    expect(await PaymentReceiptModel.countDocuments()).toBe(1);
    await expect(recordPayment(bill.id, { ...input, idempotencyKey: 'overpayment-2', amount: 151 }, admin)).rejects.toThrow('outstanding');
  });
  it('keeps simultaneous partial collections consistent with their receipts', async () => {
    const bill = await invoice();
    await Promise.all([recordPayment(bill.id, { idempotencyKey: 'concurrent-a', amount: 100, method: 'CASH' }, admin), recordPayment(bill.id, { idempotencyKey: 'concurrent-b', amount: 150, method: 'CASH' }, admin)]);
    expect((await InvoiceModel.findById(bill.id))!).toMatchObject({ amountPaid: 250, status: 'PAID' });
    expect(await PaymentReceiptModel.countDocuments()).toBe(2);
  });
  it('denies another customer proforma detail, acceptance and listing', async () => {
    const other = await ProformaInvoiceModel.create({ number: 'OTHER', customerId: new Types.ObjectId(), branchId: branch._id, financialYear: '2026-27', items: [], subtotal: 10, total: 10, status: 'SHARED' });
    await expect(getProformaInvoice(other.id, customerActor)).rejects.toThrow('not found');
    await expect(acceptProformaInvoice(other.id, customerActor)).rejects.toThrow('not found');
    expect((await listProformaInvoices({ page: 1, limit: 20 }, 'OWN', customerActor)).items).toHaveLength(0);
  });
  it('denies a technician another technician’s financial document', async () => {
    const sr = await job();
    const estimate = await EstimateModel.create({ number: 'EST', customerId: customer._id, branchId: branch._id, serviceRequestId: sr._id, financialYear: '2026-27', items: [], subtotal: 1, total: 1 });
    await expect(getEstimate(estimate.id, { ...admin, role: 'TECHNICIAN', employeeId: new Types.ObjectId().toString() })).rejects.toThrow('not found');
  });
  it('rejects forged completion OTP and app-only confirmation', async () => {
    const sr = await job();
    await expect(completeVisit(sr.id, admin.sub, { type: 'OTP', value: '123456' })).rejects.toThrow('Verify');
    await expect(completeVisit(sr.id, admin.sub, { type: 'APP_CONFIRMATION' })).rejects.toThrow('OTP or signature');
    await expect(updateStatus(sr.id, 'SERVICE_COMPLETED', admin)).rejects.toThrow('completion proof');
  });
  it('does not use a login OTP as a completion OTP', async () => {
    const sr = await job();
    await OtpModel.create({ mobile: '9000000001', purpose: 'LOGIN', otpHash: 'unused', expiresAt: new Date(Date.now() + 60000) });
    await expect(verifyCompletionOtp(sr.id, '123456')).rejects.toThrow('expired or not found');
  });
  it('keeps a rejected offline action rejected after response loss and replay', async () => {
    const sr = await job();
    const action = { idempotencyKey: 'bad-offline-1', clientTimestamp: new Date(), actionType: 'UPDATE_WORK', payload: { labourCharge: -100 } };
    expect((await processSyncBatch(sr.id, [action], admin))[0].status).toBe('REJECTED');
    expect((await processSyncBatch(sr.id, [action], admin))[0].status).toBe('REJECTED');
    expect(await ServiceVisitModel.countDocuments()).toBe(0);
  });
  it('uses India day boundaries across UTC midnight', () => {
    expect(indiaDayRange(new Date('2026-11-12T20:00:00Z')).start.toISOString()).toBe('2026-11-12T18:30:00.000Z');
  });
  it('applies concurrent offline retries only once', async () => {
    const sr = await job();
    const action = { idempotencyKey: 'parts-retry-1', clientTimestamp: new Date(), actionType: 'ADD_PARTS', payload: { parts: [{ name: 'Seal', qty: 1, unitPrice: 10 }] } };
    await Promise.all([processSyncBatch(sr.id, [action], admin), processSyncBatch(sr.id, [action], admin)]);
    expect((await ServiceVisitModel.findOne({ serviceRequestId: sr._id }))!.parts).toHaveLength(1);
    expect(await ServiceVisitModel.countDocuments()).toBe(1);
  });
  it('converts an approved estimate and accepted proforma idempotently', async () => {
    const sr = await job(repair);
    const estimate = await EstimateModel.create({ number: 'CONVERT', customerId: customer._id, branchId: branch._id, serviceRequestId: sr._id, financialYear: '2026-27', items: [{ description: 'Repair', qty: 1, unitPrice: 250, lineTotal: 250 }], subtotal: 250, total: 250, status: 'APPROVED' });
    const p1 = await convertEstimateToProforma(estimate.id, admin);
    const p2 = await convertEstimateToProforma(estimate.id, admin);
    expect(p2.id).toBe(p1.id);
    await ProformaInvoiceModel.updateOne({ _id: p1._id }, { status: 'ACCEPTED' });
    const i1 = await convertProformaToInvoice(p1.id, admin);
    const i2 = await convertProformaToInvoice(p1.id, admin);
    expect(i2.id).toBe(i1.id);
    expect(await InvoiceModel.countDocuments()).toBe(1);
  });
  async function vendorInvoice(status: 'PENDING' | 'APPROVED' | 'PAID' = 'APPROVED') {
    const vendor = await VendorModel.create({ companyName: 'Vendor' });
    const inv = await VendorInvoiceModel.create({ number: new Types.ObjectId().toString(), vendorId: vendor._id, serviceRequestIds: [new Types.ObjectId()], amount: 200, commissionBreakup: { grossAmount: 250, commissionRate: 20, commissionAmount: 50, netPayable: 200 }, status });
    return { vendor, inv };
  }
  it('rejects payouts for pending, foreign or already allocated invoices', async () => {
    const { vendor, inv } = await vendorInvoice('PENDING');
    await expect(createVendorPayout({ vendorId: vendor.id, vendorInvoiceIds: [inv.id] }, admin)).rejects.toThrow('approved invoices');
    await approveVendorInvoice(inv.id, admin);
    await expect(createVendorPayout({ vendorId: new Types.ObjectId().toString(), vendorInvoiceIds: [inv.id] }, admin)).rejects.toThrow('approved invoices');
    await createVendorPayout({ vendorId: vendor.id, vendorInvoiceIds: [inv.id] }, admin);
    await expect(createVendorPayout({ vendorId: vendor.id, vendorInvoiceIds: [inv.id] }, admin)).rejects.toThrow('allocated');
  });
  it('pays vendor invoices once and prevents paid invoices being reapproved', async () => {
    const { vendor, inv } = await vendorInvoice();
    const payout = await createVendorPayout({ vendorId: vendor.id, vendorInvoiceIds: [inv.id] }, admin);
    await markPayoutPaid(payout.id, 'BANK-REF-1', admin);
    await markPayoutPaid(payout.id, 'BANK-REF-1', admin);
    expect((await VendorInvoiceModel.findById(inv.id))!.status).toBe('PAID');
    await expect(approveVendorInvoice(inv.id, admin)).rejects.toThrow('Only pending');
    await expect(markPayoutPaid(payout.id, 'DIFFERENT', admin)).rejects.toThrow('another reference');
  });
  it('requires repair estimate approval before starting work', async () => {
    const sr = await job(repair, { status: 'INSPECTION_COMPLETED' });
    await expect(updateStatus(sr.id, 'WORK_STARTED', admin)).rejects.toThrow('approve the repair estimate');
  });
  it('does not let a status-only request mark unpaid work paid', async () => {
    const sr = await job(fixed, { status: 'PAYMENT_PENDING' });
    await expect(updateStatus(sr.id, 'PAID', admin)).rejects.toThrow('verified collection');
  });
  it('commits the receipt, invoice and payment-pending job together', async () => {
    const sr = await job(fixed, { status: 'PAYMENT_PENDING' });
    const bill = await invoice(sr._id);
    await recordPayment(bill.id, { idempotencyKey: 'job-payment-1', amount: 250, method: 'CASH' }, admin);
    expect((await ServiceRequestModel.findById(sr.id))!.status).toBe('PAID');
    expect((await InvoiceModel.findById(bill.id))!.status).toBe('PAID');
    expect(await PaymentReceiptModel.countDocuments()).toBe(1);
  });
  it('adds only customer-approved extras to a fixed booking invoice', async () => {
    const sr = await job();
    await EstimateModel.create({ number: 'EXTRA', customerId: customer._id, branchId: branch._id, serviceRequestId: sr._id, financialYear: '2026-27', items: [{ description: 'Approved extra', qty: 1, unitPrice: 50, lineTotal: 50 }], subtotal: 50, total: 50, status: 'APPROVED' });
    await EstimateModel.create({ number: 'REJECTED', customerId: customer._id, branchId: branch._id, serviceRequestId: sr._id, financialYear: '2026-27', items: [{ description: 'Rejected extra', qty: 1, unitPrice: 100, lineTotal: 100 }], subtotal: 100, total: 100, status: 'REJECTED' });
    const bill = await createDirectInvoice({ customerId: customer.id, branchId: branch.id, serviceRequestId: sr.id, items: [{ description: 'Client tampering', qty: 1, unitPrice: 9999 }] }, admin);
    expect(bill.total).toBe(300);
    expect(bill.items.map(item => item.description).join(' ')).not.toContain('Rejected extra');
  });
});
