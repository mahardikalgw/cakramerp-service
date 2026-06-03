import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface SalesTraceLink {
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  targetType: string;
  targetId: string;
  targetNumber: string;
  linkKind: string;
  createdAt: string;
}

export interface SalesTraceChainNode {
  type: string;
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string | null;
  children: SalesTraceChainNode[];
}

export interface SalesTraceChainResponse {
  root: SalesTraceChainNode;
  links: SalesTraceLink[];
}

/**
 * Traceability for sales-side chains:
 * Quotation → SO → Stock Issuance → AR Invoice → Customer Payment, and Sales Return.
 */
@Injectable()
export class SalesTraceabilityService {
  constructor(private readonly dataSource: DataSource) {}

  async getChain(
    sourceType: string,
    sourceId: string,
  ): Promise<SalesTraceChainResponse> {
    const root = await this.fetchNode(sourceType, sourceId);
    if (!root) {
      throw new NotFoundException(`${sourceType} ${sourceId} not found`);
    }

    const links: any[] = await this.dataSource.query(
      `SELECT source_type, source_id, target_type, target_id, link_kind, created_at
       FROM document_links
       WHERE (source_type = $1 AND source_id = $2)
          OR (target_type = $1 AND target_id = $2)
       ORDER BY created_at ASC`,
      [sourceType, sourceId],
    );

    const linkResponses: SalesTraceLink[] = [];
    for (const l of links) {
      linkResponses.push({
        sourceType: l.source_type,
        sourceId: l.source_id,
        sourceNumber: await this.fetchNumber(l.source_type, l.source_id),
        targetType: l.target_type,
        targetId: l.target_id,
        targetNumber: await this.fetchNumber(l.target_type, l.target_id),
        linkKind: l.link_kind,
        createdAt: l.created_at,
      });
    }

    return { root, links: linkResponses };
  }

  private async fetchNode(
    type: string,
    id: string,
  ): Promise<SalesTraceChainNode | null> {
    const lookup: Record<string, string> = {
      quotation: `SELECT id, quotation_number AS number, grand_total AS amount, status, quotation_date AS date FROM quotations WHERE id = $1`,
      sales_order: `SELECT id, so_number AS number, grand_total AS amount, status, order_date AS date FROM sales_orders WHERE id = $1`,
      sales_return: `SELECT id, return_number AS number, total_amount AS amount, status, return_date AS date FROM sales_returns WHERE id = $1`,
      stock_issuance: `SELECT id, issuance_number AS number, 0::numeric AS amount, status, issued_date AS date FROM stock_issuances WHERE id = $1`,
      sales_invoice: `SELECT id, invoice_number AS number, amount, status, invoice_date AS date FROM ar_invoices WHERE id = $1`,
      customer_payment: `SELECT id, payment_number AS number, amount, status, payment_date AS date FROM ar_payments WHERE id = $1`,
    };
    const sql = lookup[type];
    if (!sql) return null;
    const rows: any[] = await this.dataSource.query(sql, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      type,
      id: r.id,
      number: r.number,
      amount: Number(r.amount ?? 0),
      status: r.status,
      date: r.date,
      children: [],
    };
  }

  private async fetchNumber(type: string, id: string): Promise<string> {
    const n = await this.fetchNode(type, id);
    return n?.number ?? id.slice(0, 8);
  }
}
