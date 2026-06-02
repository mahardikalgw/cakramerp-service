import 'reflect-metadata';
import dataSource from './data-source';

async function resetMigrations() {
  console.log('🔄 Initializing data source...');
  await dataSource.initialize();

  console.log('💥 Dropping database schema...');
  await dataSource.dropDatabase();
  console.log('✅ Database dropped');

  console.log('🚀 Running all migrations...');
  await dataSource.runMigrations({ transaction: 'each' });
  console.log('✅ All migrations executed successfully');

  await dataSource.destroy();
  console.log('🎉 Database reset complete!');
  process.exit(0);
}

resetMigrations().catch((err) => {
  console.error('❌ Error resetting migrations:', err);
  process.exit(1);
});
