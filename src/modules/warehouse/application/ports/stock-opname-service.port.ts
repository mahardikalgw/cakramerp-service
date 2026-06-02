export const STOCK_OPNAME_SERVICE = Symbol('STOCK_OPNAME_SERVICE');

export interface StockOpnameServicePort {
  create(warehouseId: string, userId: string): Promise<any>;
  updateCounts(
    sessionId: string,
    lines: { itemId: string; actualQty: number }[],
  ): Promise<any[]>;
  submit(sessionId: string): Promise<any>;
  approve(sessionId: string, userId: string): Promise<any>;
  findAll(filters?: {
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  findById(id: string): Promise<any | null>;
}
