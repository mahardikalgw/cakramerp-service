import type { DataSource } from 'typeorm';
import type { RenderViewModel } from '../document-render.types';

/**
 * Loads the view model for a SQL-backed document type from Postgres using the
 * owning entity id (equivalent to the JRXML `ENTITY_ID` parameter). Mirrors the
 * Java `SqlDocumentStrategy`, which filled reports directly from a JDBC
 * connection.
 */
export type SqlViewLoader = (
  dataSource: DataSource,
  entityId: string,
) => Promise<RenderViewModel>;
