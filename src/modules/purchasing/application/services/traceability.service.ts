import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface TraceLink {
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  targetType: string;
  targetId: string;
  targetNumber: string;
  linkKind: string;
  createdAt: string;
}

export interface TraceChainNode {
  type: string;
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string | null;
  linkFromPrevious?: { kind: string };
  children: TraceChainNode[];
}

export interface TraceChainResponse {
  root: TraceChainNode;
  links: TraceLink[];
}

/**
 * Traceability service for purchasing-side chains:
 * PR → PO → GRN → AP Invoice → Payment, and PO Return.
 */
@Injectable()
export class TraceabilityService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Returns the chain rooted at any source document in the procurement
   * family. Walks both directions through `document_links` until stable.
   */
  async getChain(
    sourceType: string,
    sourceId: string,
  ): Promise<TraceChainResponse> {
    const root = await this.fetchNode(sourceType, sourceId);
    if (!root)
      throw new NotFoundException(`${sourceType} ${sourceId} not found`);

    const links: any[] = await this.dataSource.query(
      `SELECT source_type, source_id, target_type, target_id, link_kind, created_at
       FROM document_links
       WHERE (source_type = $1 AND source_id = $2)
          OR (target_type = $1 AND target_id = $2)
       ORDER BY created_at ASC`,
      [sourceType, sourceId],
    );

    const linkResponses: TraceLink[] = [];
    for (const l of links) {
      const targetNumber = await this.fetchNumber(l.target_type, l.target_id);
      const sourceNumber = await this.fetchNumber(l.source_type, l.source_id);
      linkResponses.push({
        sourceType: l.source_type,
        sourceId: l.source_id,
        sourceNumber,
        targetType: l.target_type,
        targetId: l.target_id,
        targetNumber,
        linkKind: l.link_kind,
        createdAt: l.created_at,
      });
    }

    return { root, links: linkResponses };
  }

  private async fetchNode(
    type: string,
    id: string,
  ): Promise<TraceChainNode | null> {
    const lookup: Record<string, string> = {
      purchase_request: `SELECT id, pr_number AS number, 0::numeric AS amount, status, request_date AS date FROM purchase_requests WHERE id = $1`,
      purchase_order: `SELECT id, po_number AS number, total_amount AS amount, status, order_date AS date FROM purchase_orders WHERE id = $1`,
      purchase_return: `SELECT id, return_number AS number, total_amount AS amount, status, return_date AS date FROM purchase_returns WHERE id = $1`,
      goods_receipt: `SELECT id, grn_number AS number, 0::numeric AS amount, status, received_date AS date FROM goods_receipts WHERE id = $1`,
      supplier_invoice: `SELECT id, invoice_number AS number, amount, status, invoice_date AS date FROM ap_invoices WHERE id = $1`,
      supplier_payment: `SELECT id, payment_number AS number, amount, status, payment_date AS date FROM ap_payments WHERE id = $1`,
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
