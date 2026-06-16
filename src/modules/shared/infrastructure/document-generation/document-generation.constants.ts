export const DOCUMENT_GENERATION_REQUEST_CHANNEL =
  'document.generation.request';
export const DOCUMENT_GENERATION_COMPLETED_CHANNEL =
  'document.generation.completed';
export const DOCUMENT_GENERATION_FAILED_CHANNEL = 'document.generation.failed';

export const DOCUMENT_TYPES = {
  // Purchasing
  PURCHASE_REQUEST: 'purchase_request',
  PURCHASE_ORDER: 'purchase_order',
  PURCHASE_RETURN: 'purchase_return',
  GOODS_RECEIPT: 'goods_receipt',
  SUPPLIER_INVOICE: 'supplier_invoice',
  SUPPLIER_PAYMENT: 'supplier_payment',

  // Sales
  QUOTATION: 'quotation',
  SALES_ORDER: 'sales_order',
  SALES_RETURN: 'sales_return',
  SALES_INVOICE: 'sales_invoice',
  CUSTOMER_PAYMENT: 'customer_payment',

  // Finance
  JOURNAL_ENTRY: 'journal_entry',
  AP_PAYMENT: 'ap_payment',
  AR_INVOICE: 'ar_invoice',
  TAX_INVOICE: 'tax_invoice',
  TAX_REPORT_PPN: 'tax_report_ppn',
  TRIAL_BALANCE: 'trial_balance',
  BALANCE_SHEET: 'balance_sheet',
  PROFIT_LOSS: 'profit_loss',
  CASH_FLOW: 'cash_flow',
  AGING_REPORT: 'aging_report',
  GL_LEDGER: 'gl_ledger',

  // Warehouse
  STOCK_ISSUANCE: 'stock_issuance',
  STOCK_OPNAME: 'stock_opname',
  STOCK_LEDGER: 'stock_ledger',
  STOCK_BALANCE: 'stock_balance',
  MAINTENANCE_SCHEDULE: 'maintenance_schedule',

  // HR
  PAYSLIP: 'payslip',
  PAYROLL_SUMMARY: 'payroll_summary',
  THR_REPORT: 'thr_report',
  BPJS_REPORT: 'bpjs_report',
  EMPLOYEE_CONTRACT: 'employee_contract',
  ATTENDANCE_REPORT: 'attendance_report',
  BUKTI_POTONG_1721A1: 'bukti_potong_1721a1',

  // Laboratory
  TESTING_REQUEST: 'testing_request',
  TEST_RESULT_CERTIFICATE: 'test_result_certificate',
  LAB_CONTRACT: 'lab_contract',
  LAB_PURCHASE_ORDER: 'lab_purchase_order',
  LAB_INVOICE: 'lab_invoice',
  DAILY_REPORT: 'daily_report',
  SAMPLE_TRACKING: 'sample_tracking',
  LAB_DRAFT_REPORT: 'lab_draft_report',
  LAB_FINAL_REPORT: 'lab_final_report',
  LAB_POST_APPROVAL_CONTRACT: 'lab_post_approval_contract',
  LAB_TAX_INVOICE: 'lab_tax_invoice',
  TESTING_RESULT_CERTIFICATE_POST: 'testing_result_certificate_post',

  // Asset
  ASSET_REGISTER: 'asset_register',
  DEPRECIATION_SCHEDULE: 'depreciation_schedule',
  ASSET_DISPOSAL: 'asset_disposal',

  // Self-Service
  LEAVE_REQUEST: 'leave_request',
  OVERTIME_REQUEST: 'overtime_request',
  DISCREPANCY_REPORT: 'discrepancy_report',

  // Spending
  EXPENSE_VOUCHER: 'expense_voucher',
  EXPENSE_REPORT: 'expense_report',

  // Customer/Supplier
  CUSTOMER_STATEMENT: 'customer_statement',
  SUPPLIER_STATEMENT: 'supplier_statement',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const OUTPUT_FORMATS = ['pdf', 'xlsx', 'csv'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
