import { Inject, Injectable } from '@nestjs/common';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import type { GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import { SOURCE_TYPES, GL_EVENTS } from '../../../../modules/shared/commercial-document.constants';

/**
 * HR → Finance adapter.
 *
 * Owns the conversion of payroll runs into GL posting queue entries.
 * This adapter is the only place HR talks to finance.
 */
@Injectable()
export class HrFinanceAdapter {
  constructor(
    @Inject(GL_POSTING_QUEUE_PORT)
    private readonly glPostingQueue: GlPostingQueuePort,
  ) {}

async recordPayrollGl(
    run: { id: string; month: number; year: number },
    details: any[],
    ): Promise<{ glPostingQueueId: string }> {
    const totalGross = details.reduce(
      (s, d) => s + Number(d.grossPay ?? 0),
      0,
    );
    const totalBpjsEmployee = details.reduce(
      (s, d) =>
        s +
        Number(d.bpjsKesehatanEmployee ?? 0) +
        Number(d.bpjsJht ?? 0) +
        Number(d.bpjsJp ?? 0),
      0,
    );
    const totalBpjsEmployer = details.reduce(
      (s, d) =>
        s +
        Number(d.bpjsKesehatanEmployer ?? 0) +
        Number(d.bpjsJkk ?? 0) +
        Number(d.bpjsJkm ?? 0),
      0,
    );
    const totalPph21 = details.reduce(
      (s, d) => s + Number(d.pph21 ?? 0),
      0,
    );
    const totalNet = details.reduce(
      (s, d) => s + Number(d.netPay ?? 0),
      0,
    );

const entry = await this.glPostingQueue.createEntry({
       sourceType: SOURCE_TYPES.PAYROLL_RUN,
       sourceId: run.id,
       sourceNumber: `PAYROLL-${run.year}-${String(run.month).padStart(2, '0')}`,
       eventType: GL_EVENTS.PAYROLL_RUN,
       amount: totalGross,
       description: `Payroll ${run.month}/${run.year} — ${details.length} employees`,
       suggestedLines: [
         {
           accountId: '',
           accountCode: '5101',
           accountName: 'Biaya Gaji Karyawan',
           debit: totalGross,
           credit: 0,
           description: `Gaji karyawan periode ${run.month}/${run.year}`,
         },
         {
           accountId: '',
           accountCode: '5102',
           accountName: 'Biaya BPJS Perusahaan',
           debit: totalBpjsEmployer,
           credit: 0,
           description: 'Biaya BPJS perusahaan',
         },
         {
           accountId: '',
           accountCode: '2300',
           accountName: 'Hutang BPJS',
           debit: 0,
           credit: totalBpjsEmployee + totalBpjsEmployer,
           description: 'Hutang BPJS (karyawan + perusahaan)',
         },
         {
           accountId: '',
           accountCode: '2310',
           accountName: 'Hutang PPh 21',
           debit: 0,
           credit: totalPph21,
           description: 'Hutang PPh 21',
         },
         {
           accountId: '',
           accountCode: '1100',
           accountName: 'Kas & Bank',
           debit: 0,
           credit: totalNet,
           description: 'Pembayaran bersih gaji karyawan',
         },
       ],
     });

    return { glPostingQueueId: entry.id };
  }
}