import type { TemplateBuilder } from './shared';
import { DOCUMENT_TYPES } from '../document-generation.constants';

import { purchaseRequestTemplate } from './purchasing/purchase-request.template';
import { purchaseOrderTemplate } from './purchasing/purchase-order.template';
import { purchaseReturnTemplate } from './purchasing/purchase-return.template';
import { quotationTemplate } from './sales/quotation.template';
import { salesOrderTemplate } from './sales/sales-order.template';
import { salesInvoiceTemplate } from './sales/sales-invoice.template';
import { journalEntryTemplate } from './finance/journal-entry.template';
import { payslipTemplate } from './hr/payslip.template';
import { payrollSummaryTemplate } from './hr/payroll-summary.template';
import { leaveRequestTemplate } from './self-service/leave-request.template';
import { overtimeRequestTemplate } from './self-service/overtime-request.template';
import { goodsReceiptTemplate } from './warehouse/goods-receipt.template';
import { labPurchaseOrderTemplate } from './laboratory/lab-purchase-order.template';
import { labInvoiceTemplate } from './laboratory/lab-invoice.template';
import { labTaxInvoiceTemplate } from './laboratory/lab-tax-invoice.template';
import { labContractTemplate } from './laboratory/lab-contract.template';
import { testingResultCertificateTemplate } from './laboratory/testing-result-certificate.template';
import { contractMonthlyInvoiceTemplate } from './laboratory/contract-monthly-invoice.template';
import { labDraftReportTemplate } from './laboratory/lab-draft-report.template';
import { labFinalReportTemplate } from './laboratory/lab-final-report.template';

/** Every document type maps to exactly one template builder. */
export const TEMPLATES: Record<string, TemplateBuilder> = {
  [DOCUMENT_TYPES.PURCHASE_REQUEST]: purchaseRequestTemplate,
  [DOCUMENT_TYPES.PURCHASE_ORDER]: purchaseOrderTemplate,
  [DOCUMENT_TYPES.PURCHASE_RETURN]: purchaseReturnTemplate,
  [DOCUMENT_TYPES.QUOTATION]: quotationTemplate,
  [DOCUMENT_TYPES.SALES_ORDER]: salesOrderTemplate,
  [DOCUMENT_TYPES.SALES_INVOICE]: salesInvoiceTemplate,
  [DOCUMENT_TYPES.JOURNAL_ENTRY]: journalEntryTemplate,
  [DOCUMENT_TYPES.PAYSLIP]: payslipTemplate,
  [DOCUMENT_TYPES.PAYROLL_SUMMARY]: payrollSummaryTemplate,
  [DOCUMENT_TYPES.LEAVE_REQUEST]: leaveRequestTemplate,
  [DOCUMENT_TYPES.OVERTIME_REQUEST]: overtimeRequestTemplate,
  [DOCUMENT_TYPES.GOODS_RECEIPT]: goodsReceiptTemplate,
  [DOCUMENT_TYPES.LAB_PURCHASE_ORDER]: labPurchaseOrderTemplate,
  [DOCUMENT_TYPES.LAB_INVOICE]: labInvoiceTemplate,
  [DOCUMENT_TYPES.LAB_TAX_INVOICE]: labTaxInvoiceTemplate,
  [DOCUMENT_TYPES.TAX_INVOICE]: labTaxInvoiceTemplate,
  [DOCUMENT_TYPES.LAB_CONTRACT]: labContractTemplate,
  [DOCUMENT_TYPES.LAB_POST_APPROVAL_CONTRACT]: labContractTemplate,
  [DOCUMENT_TYPES.CONTRACT_MONTHLY_INVOICE]: contractMonthlyInvoiceTemplate,
  [DOCUMENT_TYPES.TEST_RESULT_CERTIFICATE]: testingResultCertificateTemplate,
  [DOCUMENT_TYPES.TESTING_RESULT_CERTIFICATE]: testingResultCertificateTemplate,
  [DOCUMENT_TYPES.TESTING_RESULT_CERTIFICATE_POST]:
    testingResultCertificateTemplate,
  [DOCUMENT_TYPES.LAB_DRAFT_REPORT]: labDraftReportTemplate,
  [DOCUMENT_TYPES.LAB_FINAL_REPORT]: labFinalReportTemplate,
};

export function getTemplate(documentType: string): TemplateBuilder {
  const template = TEMPLATES[documentType];
  if (!template) {
    throw new Error(
      `No template registered for document type: ${documentType}`,
    );
  }
  return template;
}

export * from './shared';
