import 'dotenv/config';
import { DataSource } from 'typeorm';
import { DatabaseConfigService } from './infrastructure/config/database-config.service';
import { TypeOrmConfigFactory } from './infrastructure/orm/typeorm-config.factory';

async function runMigrations() {
  const configService = new DatabaseConfigService();
  const config = configService.getConfig();

  const dataSource = TypeOrmConfigFactory.createDataSource(config);

  try {
    await dataSource.initialize();
    console.log('Database connected. Running migrations...');

    const migrations = await dataSource.runMigrations({ transaction: 'each' });
    console.log(`Successfully ran ${migrations.length} migration(s).`);

    if (migrations.length === 0) {
      console.log('No pending migrations.');
    } else {
      for (const m of migrations) {
        console.log(`  ✓ ${m.name}`);
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runMigrations();
