import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedCustomersAndSuppliers20250528000002 implements MigrationInterface {
  name = 'SeedCustomersAndSuppliers20250528000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed customers
    await queryRunner.query(`
      INSERT INTO customers (name, email, phone, address, city, contact_person, tax_id, notes)
      VALUES
        ('PT Maju Bersama', 'finance@majubersama.co.id', '021-5551234', 'Jl. Sudirman No. 45, Jakarta Selatan', 'Jakarta', 'Budi Santoso', '01.234.567.8-012.000', 'Key account - manufacturing sector'),
        ('CV Karya Mandiri', 'admin@karyamandiri.com', '022-7654321', 'Jl. Asia Afrika No. 12, Bandung', 'Bandung', 'Siti Rahayu', '02.345.678.9-023.000', 'Regular customer since 2023'),
        ('PT Sentosa Abadi', 'purchasing@sentosaabadi.co.id', '031-8887766', 'Jl. Pemuda No. 88, Surabaya', 'Surabaya', 'Agus Wijaya', '03.456.789.0-034.000', 'Large enterprise client'),
        ('UD Berkah Jaya', 'berkah.jaya@gmail.com', '024-6543210', 'Jl. Pandanaran No. 33, Semarang', 'Semarang', 'Hendra Kusuma', '04.567.890.1-045.000', NULL),
        ('PT Global Teknologi', 'info@globaltek.co.id', '021-9998877', 'Jl. TB Simatupang No. 99, Jakarta Timur', 'Jakarta', 'Diana Putri', '05.678.901.2-056.000', 'IT services client'),
        ('CV Sumber Makmur', 'order@sumbermakmur.com', '061-4445566', 'Jl. Gatot Subroto No. 15, Medan', 'Medan', 'Rizky Pratama', '06.789.012.3-067.000', 'Distributor partner'),
        ('PT Nusantara Indah', 'sales@nusantaraindah.co.id', '0274-556677', 'Jl. Malioboro No. 22, Yogyakarta', 'Yogyakarta', 'Wati Sulistyo', '07.890.123.4-078.000', 'Retail chain customer'),
        ('PT Cahaya Timur', 'finance@cahayatimur.co.id', '0411-332211', 'Jl. Pettarani No. 50, Makassar', 'Makassar', 'Andi Firmansyah', '08.901.234.5-089.000', 'Eastern region key account')
      ON CONFLICT DO NOTHING;
    `)

    // Seed suppliers
    await queryRunner.query(`
      INSERT INTO suppliers (name, email, phone, address, city, contact_person, tax_id, notes)
      VALUES
        ('PT Bahan Utama Indonesia', 'sales@bahanutama.co.id', '021-1112233', 'Jl. Industri Raya No. 10, Tangerang', 'Tangerang', 'Joko Widodo', '11.234.567.8-112.000', 'Primary raw material supplier'),
        ('CV Logistik Cepat', 'cs@logistikcepat.com', '021-4445566', 'Jl. Raya Bogor KM 25, Depok', 'Depok', 'Rina Marlina', '12.345.678.9-123.000', 'Logistics and shipping partner'),
        ('PT Mesin Jaya Abadi', 'order@mesinjaya.co.id', '031-7778899', 'Jl. Rungkut Industri No. 5, Surabaya', 'Surabaya', 'Bambang Suryadi', '13.456.789.0-134.000', 'Machinery and spare parts supplier'),
        ('PT Teknologi Solusi', 'procurement@teksolusi.co.id', '021-2223344', 'Jl. Rasuna Said No. 18, Jakarta Selatan', 'Jakarta', 'Dewi Anggraini', '14.567.890.1-145.000', 'IT hardware and software vendor'),
        ('CV Packaging Prima', 'info@packagingprima.com', '022-8889900', 'Jl. Soekarno Hatta No. 77, Bandung', 'Bandung', 'Eko Prasetyo', '15.678.901.2-156.000', 'Packaging materials supplier'),
        ('PT Energi Mandiri', 'supply@energimandiri.co.id', '021-6667788', 'Jl. Gatot Subroto No. 200, Jakarta Pusat', 'Jakarta', 'Fajar Nugroho', '16.789.012.3-167.000', 'Fuel and energy supplier'),
        ('UD Alat Kantor Sejahtera', 'order@alatkantor.com', '024-1234567', 'Jl. Ahmad Yani No. 55, Semarang', 'Semarang', 'Lestari Wulandari', '17.890.123.4-178.000', 'Office supplies vendor'),
        ('PT Kimia Farma Supply', 'b2b@kimiafarmasupply.co.id', '021-3334455', 'Jl. Veteran No. 9, Jakarta Pusat', 'Jakarta', 'Gunawan Setiawan', '18.901.234.5-189.000', 'Chemical and cleaning supplies')
      ON CONFLICT DO NOTHING;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM customers WHERE email IN ('finance@majubersama.co.id','admin@karyamandiri.com','purchasing@sentosaabadi.co.id','berkah.jaya@gmail.com','info@globaltek.co.id','order@sumbermakmur.com','sales@nusantaraindah.co.id','finance@cahayatimur.co.id');`)
    await queryRunner.query(`DELETE FROM suppliers WHERE email IN ('sales@bahanutama.co.id','cs@logistikcepat.com','order@mesinjaya.co.id','procurement@teksolusi.co.id','info@packagingprima.com','supply@energimandiri.co.id','order@alatkantor.com','b2b@kimiafarmasupply.co.id');`)
  }
}
