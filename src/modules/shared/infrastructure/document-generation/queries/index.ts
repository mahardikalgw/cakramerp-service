import type { SqlViewLoader } from '../domain/ports/document-data-source.port';
import { DOCUMENT_TYPES } from '../document-generation.constants';

import { purchaseRequestLoader } from './purchase-request.loader';
import { purchaseOrderLoader } from './purchase-order.loader';
import { purchaseReturnLoader } from './purchase-return.loader';
import { quotationLoader } from './quotation.loader';
import { salesOrderLoader } from './sales-order.loader';
import { salesInvoiceLoader } from './sales-invoice.loader';
import { journalEntryLoader } from './journal-entry.loader';
import { payslipLoader } from './payslip.loader';
import { payrollSummaryLoader } from './payroll-summary.loader';
import { leaveRequestLoader } from './leave-request.loader';
import { overtimeRequestLoader } from './overtime-request.loader';
import { goodsReceiptLoader } from './goods-receipt.loader';
import {
  labDraftReportLoader,
  labFinalReportLoader,
} from './lab-report.loader';

/** Every SQL-backed document type maps to exactly one view loader. */
export const SQL_LOADERS: Record<string, SqlViewLoader> = {
  [DOCUMENT_TYPES.PURCHASE_REQUEST]: purchaseRequestLoader,
  [DOCUMENT_TYPES.PURCHASE_ORDER]: purchaseOrderLoader,
  [DOCUMENT_TYPES.PURCHASE_RETURN]: purchaseReturnLoader,
  [DOCUMENT_TYPES.QUOTATION]: quotationLoader,
  [DOCUMENT_TYPES.SALES_ORDER]: salesOrderLoader,
  [DOCUMENT_TYPES.SALES_INVOICE]: salesInvoiceLoader,
  [DOCUMENT_TYPES.JOURNAL_ENTRY]: journalEntryLoader,
  [DOCUMENT_TYPES.PAYSLIP]: payslipLoader,
  [DOCUMENT_TYPES.PAYROLL_SUMMARY]: payrollSummaryLoader,
  [DOCUMENT_TYPES.LEAVE_REQUEST]: leaveRequestLoader,
  [DOCUMENT_TYPES.OVERTIME_REQUEST]: overtimeRequestLoader,
  [DOCUMENT_TYPES.GOODS_RECEIPT]: goodsReceiptLoader,
  [DOCUMENT_TYPES.LAB_DRAFT_REPORT]: labDraftReportLoader,
  [DOCUMENT_TYPES.LAB_FINAL_REPORT]: labFinalReportLoader,
};

export function getSqlLoader(documentType: string): SqlViewLoader | undefined {
  return SQL_LOADERS[documentType];
}

export type { SqlViewLoader };
