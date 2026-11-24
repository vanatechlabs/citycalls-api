import PDFDocument from 'pdfkit';
import path from 'path';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { NotFoundError, UnauthorizedError } from './errors';
import { EstimateModel } from '../modules/finance/estimates.model';
import { ProformaInvoiceModel } from '../modules/finance/proformaInvoices.model';
import { InvoiceModel } from '../modules/finance/invoices.model';
import { PaymentReceiptModel } from '../modules/finance/paymentReceipts.model';
import { CreditNoteModel, DebitNoteModel } from '../modules/finance/creditDebitNotes.model';
import { CustomerModel } from '../modules/customers/customers.model';
import { BranchModel } from '../modules/organization/organization.model';
import { assertFinanceAccess } from '../modules/finance/financeAccess';
import { AccessTokenPayload } from './jwt';

export const DOCUMENT_TYPES = ['ESTIMATE', 'PROFORMA_INVOICE', 'INVOICE', 'PAYMENT_RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const;
type DocumentType = typeof DOCUMENT_TYPES[number];

export async function financialDocument(type: string, id: string) {
  if (!DOCUMENT_TYPES.includes(type as DocumentType) || !Types.ObjectId.isValid(id)) throw new NotFoundError('Document not found');
  const record = type === 'ESTIMATE' ? await EstimateModel.findById(id).lean()
    : type === 'PROFORMA_INVOICE' ? await ProformaInvoiceModel.findById(id).lean()
    : type === 'INVOICE' ? await InvoiceModel.findById(id).lean()
    : type === 'PAYMENT_RECEIPT' ? await PaymentReceiptModel.findById(id).lean()
    : type === 'CREDIT_NOTE' ? await CreditNoteModel.findById(id).lean() : await DebitNoteModel.findById(id).lean();
  if (!record) throw new NotFoundError('Document not found');
  return record;
}

export async function authorizeDocument(type: string, id: string, actor: AccessTokenPayload) {
  const record = await financialDocument(type, id);
  const linkedInvoice = 'invoiceId' in record ? await InvoiceModel.findById(record.invoiceId) : null;
  await assertFinanceAccess(linkedInvoice ?? record, actor);
  return record;
}

// Purpose-bound links expire; the authenticated download endpoint creates fresh ones.
export async function generateDocumentPdf(type: string, id: string): Promise<string> {
  const token = jwt.sign({ purpose: 'FINANCIAL_PDF', documentType: type, documentId: id }, env.jwtAccessSecret, { expiresIn: '1h' });
  return `/api/v1/financial-documents/${type}/${id}.pdf?token=${encodeURIComponent(token)}`;
}

export function verifyDocumentToken(type: string, id: string, token: string) {
  try {
    const value = jwt.verify(token, env.jwtAccessSecret) as jwt.JwtPayload;
    if (value.purpose !== 'FINANCIAL_PDF' || value.documentType !== type || value.documentId !== id) throw new Error();
  } catch { throw new UnauthorizedError('Document link expired or invalid. Download a fresh copy from the app.'); }
}

export async function renderFinancialPdf(type: string, id: string): Promise<Buffer> {
  const record = await financialDocument(type, id);
  const [customer, branch] = await Promise.all([CustomerModel.findById(record.customerId).lean(), BranchModel.findById(record.branchId).lean()]);
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${type.replace(/_/g, ' ')} ${record.number}`, Author: 'CityCalls' } });
  doc.registerFont('Latin', path.resolve(__dirname, '../../assets/fonts/NotoSans-Regular.ttf'));
  doc.registerFont('Hindi', path.resolve(__dirname, '../../assets/fonts/NotoSansDevanagari-Regular.ttf'));
  doc.font('Latin');
  const text = (value: string) => {
    const runs = value.split(/([\u0900-\u097f]+)/).filter(Boolean);
    runs.forEach((run, index) => doc.font(/[\u0900-\u097f]/.test(run) ? 'Hindi' : 'Latin').text(run, { continued: index < runs.length - 1 }));
    doc.font('Latin');
  };
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => { doc.on('data', (chunk: Buffer) => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  doc.fillColor('#126b43').fontSize(24).text('CityCalls');
  doc.fillColor('#111827').fontSize(15).text(type.replace(/_/g, ' '));
  doc.fontSize(10).text(`Number: ${record.number}`).text(`Date: ${new Date(record.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  doc.moveDown(); text(`Branch: ${branch?.name ?? '-'}`); text(`Customer: ${customer?.name ?? '-'}`);
  if (branch?.gstin) text(`Supplier GSTIN: ${branch.gstin}`);
  if (branch?.registeredAddress) text([branch.registeredAddress.line1, branch.registeredAddress.city, branch.registeredAddress.state, branch.registeredAddress.pinCode].filter(Boolean).join(', '));
  if (customer?.gstin) doc.text(`Customer GSTIN: ${customer.gstin}`);
  doc.moveDown();
  const money = (value: number) => `INR ${value.toFixed(2)}`;
  if ('items' in record) {
    for (const item of record.items) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(10); text(item.description);
      doc.fillColor('#4b5563').text(`${item.qty} x ${money(item.unitPrice)} = ${money(item.lineTotal)}`).fillColor('#111827').moveDown(0.5);
    }
    doc.moveDown().text(`Subtotal: ${money(record.subtotal)}`).text(`Discount: ${money(record.discount)}`);
    doc.text(`CGST: ${money(record.taxBreakup.cgst)}   SGST: ${money(record.taxBreakup.sgst)}   IGST: ${money(record.taxBreakup.igst)}`);
    doc.text(`Rounding: ${money(record.roundOff)}`).fontSize(14).text(`Total: ${money(record.total)}`);
    if ('amountPaid' in record) doc.fontSize(10).text(`Paid: ${money(record.amountPaid)}   Outstanding: ${money(Math.max(0, record.total - record.amountPaid))}`);
  } else {
    doc.fontSize(14).text(`Amount: ${money(record.amount)}`);
    if ('method' in record) doc.fontSize(10).text(`Method: ${record.method}`).text(`Reference: ${record.reference ?? '-'}`);
    if ('reason' in record) { doc.fontSize(10); text(`Reason: ${record.reason}`); }
  }
  doc.moveDown().fontSize(9).fillColor('#6b7280').text('Generated electronically by CityCalls.');
  doc.end();
  return result;
}
