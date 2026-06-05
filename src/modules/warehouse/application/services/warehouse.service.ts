import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface WarehouseResponseDto {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class WarehouseService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filters?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: WarehouseResponseDto[]; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.search) {
      conditions.push(
        `(w.name ILIKE $${paramIndex} OR w.location ILIKE $${paramIndex})`,
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`w.is_active = $${paramIndex}`);
      params.push(filters.isActive);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM warehouses w ${whereClause}`,
      params,
    );
    const total = parseInt(countResult[0].total, 10);

    const data = await this.dataSource.query(
      `SELECT w.id, w.name, w.location, w.type, w.is_active, w.created_at, w.updated_at
       FROM warehouses w
       ${whereClause}
       ORDER BY w.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return {
      data: data.map((row: any) => this.toResponse(row)),
      total,
    };
  }

  async findById(id: string): Promise<WarehouseResponseDto | null> {
    const rows = await this.dataSource.query(
      `SELECT id, name, location, type, is_active, created_at, updated_at
       FROM warehouses WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows.length > 0 ? this.toResponse(rows[0]) : null;
  }

  async create(data: {
    name: string;
    location: string;
    type: string;
    isActive?: boolean;
  }): Promise<WarehouseResponseDto> {
    const existing = await this.dataSource.query(
      `SELECT id FROM warehouses WHERE name = $1 LIMIT 1`,
      [data.name],
    );
    if (existing.length > 0) {
      throw new ConflictException('Warehouse with this name already exists');
    }

    const rows = await this.dataSource.query(
      `INSERT INTO warehouses (name, location, type, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, location, type, is_active, created_at, updated_at`,
      [data.name, data.location, data.type, data.isActive ?? true],
    );

    return this.toResponse(rows[0]);
  }

  async update(
    id: string,
    data: {
      name?: string;
      location?: string;
      type?: string;
      isActive?: boolean;
    },
  ): Promise<WarehouseResponseDto | null> {
    const existing = await this.dataSource.query(
      `SELECT id FROM warehouses WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (existing.length === 0) {
      throw new NotFoundException('Warehouse not found');
    }

    if (data.name) {
      const duplicate = await this.dataSource.query(
        `SELECT id FROM warehouses WHERE name = $1 AND id != $2 LIMIT 1`,
        [data.name, id],
      );
      if (duplicate.length > 0) {
        throw new ConflictException('Warehouse with this name already exists');
      }
    }

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }
    if (data.location !== undefined) {
      setClauses.push(`location = $${paramIndex}`);
      params.push(data.location);
      paramIndex++;
    }
    if (data.type !== undefined) {
      setClauses.push(`type = $${paramIndex}`);
      params.push(data.type);
      paramIndex++;
    }
    if (data.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`);
      params.push(data.isActive);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return null;
    }

    params.push(id);
    const rows = await this.dataSource.query(
      `UPDATE warehouses SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, location, type, is_active, created_at, updated_at`,
      params,
    );

    return this.toResponse(rows[0]);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.dataSource.query(
      `SELECT id FROM warehouses WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (existing.length === 0) {
      throw new NotFoundException('Warehouse not found');
    }
    await this.dataSource.query(`DELETE FROM warehouses WHERE id = $1`, [id]);
  }

  private toResponse(row: any): WarehouseResponseDto {
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      type: row.type,
      isActive: row.is_active,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    };
  }
}
