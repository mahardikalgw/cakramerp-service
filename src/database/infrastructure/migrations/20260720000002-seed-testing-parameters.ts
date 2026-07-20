import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestingParameters20260720000002
  implements MigrationInterface
{
  name = 'SeedTestingParameters20260720000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const params = [
      // ── SOIL TESTING ──
      { serviceCode: 'SRV-SOIL-001', name: 'Kadar Air', standard: 'SNI 1965:2008', unit: '%' },
      { serviceCode: 'SRV-SOIL-001', name: 'Berat Volume Basah', standard: 'SNI 1965:2008', unit: 'g/cm³' },
      { serviceCode: 'SRV-SOIL-002', name: 'Berat Jenis', standard: 'SNI 1964:2008', unit: '-' },
      { serviceCode: 'SRV-SOIL-002', name: 'Void Ratio', standard: 'SNI 1964:2008', unit: '-' },
      { serviceCode: 'SRV-SOIL-003', name: 'Distribusi Butiran', standard: 'SNI 3423:2008', unit: '%' },
      { serviceCode: 'SRV-SOIL-003', name: 'Coeff. Uniformitas', standard: 'SNI 3423:2008', unit: '-' },
      { serviceCode: 'SRV-SOIL-004', name: 'Batas Cair', standard: 'SNI 1966:2008', unit: '%' },
      { serviceCode: 'SRV-SOIL-004', name: 'Batas Plastis', standard: 'SNI 1967:2008', unit: '%' },
      { serviceCode: 'SRV-SOIL-004', name: 'Indeks Plastisitas', standard: 'SNI 1966:2008', unit: '-' },
      { serviceCode: 'SRV-SOIL-005', name: 'Optimum Moisture Content', standard: 'SNI 1742:2008', unit: '%' },
      { serviceCode: 'SRV-SOIL-005', name: 'Max Dry Density', standard: 'SNI 1742:2008', unit: 'g/cm³' },
      { serviceCode: 'SRV-SOIL-006', name: 'Nilai CBR', standard: 'SNI 1744:2012', unit: '%' },
      { serviceCode: 'SRV-SOIL-007', name: 'Koefisien Permeabilitas', standard: 'SNI 03-2828-1992', unit: 'cm/s' },
      { serviceCode: 'SRV-SOIL-008', name: 'Kohesi', standard: 'SNI 2813:2008', unit: 'kPa' },
      { serviceCode: 'SRV-SOIL-008', name: 'Sudut Geser', standard: 'SNI 2813:2008', unit: '°' },
      { serviceCode: 'SRV-SOIL-009', name: 'Kohesi Undrained', standard: 'SNI', unit: 'kPa' },
      { serviceCode: 'SRV-SOIL-009', name: 'Sudut Geser Undrained', standard: 'SNI', unit: '°' },
      { serviceCode: 'SRV-SOIL-010', name: 'Nilai Konsolidasi', standard: 'SNI 2812:2011', unit: 'cm²/s' },
      { serviceCode: 'SRV-SOIL-010', name: 'Kompressibilitas', standard: 'SNI 2812:2011', unit: 'm²/MN' },

      // ── CONCRETE TESTING ──
      { serviceCode: 'SRV-BETON-001', name: 'Slump', standard: 'SNI 1972:2008', unit: 'cm' },
      { serviceCode: 'SRV-BETON-001', name: 'Temperatur Beton Segar', standard: 'SNI 1972:2008', unit: '°C' },
      { serviceCode: 'SRV-BETON-002', name: 'Kuat Tekan Silinder', standard: 'SNI 1974:2011', unit: 'MPa' },
      { serviceCode: 'SRV-BETON-003', name: 'Kuat Tekan Kubus', standard: 'SNI 1974:2011', unit: 'MPa' },
      { serviceCode: 'SRV-BETON-004', name: 'Kuat Lentur', standard: 'SNI 4431:2011', unit: 'MPa' },
      { serviceCode: 'SRV-BETON-005', name: 'Kuat Tekan Core Drill', standard: 'SNI 1974:2011', unit: 'MPa' },
      { serviceCode: 'SRV-BETON-005', name: 'Daya Rekat Core Drill', standard: 'SNI', unit: 'MPa' },
      { serviceCode: 'SRV-BETON-006', name: 'Nilai Rebound', standard: 'SNI', unit: '-' },
      { serviceCode: 'SRV-BETON-006', name: 'Perkiraan Kuat Tekan', standard: 'SNI', unit: 'MPa' },

      // ── AGGREGATE TESTING ──
      { serviceCode: 'SRV-AGG-001', name: 'Gradasi Agregat', standard: 'SNI ASTM C136:2012', unit: '%' },
      { serviceCode: 'SRV-AGG-001', name: 'Fineness Modulus', standard: 'SNI ASTM C136:2012', unit: '-' },
      { serviceCode: 'SRV-AGG-002', name: 'Angka Kehausan Los Angeles', standard: 'SNI 2417:2008', unit: '%' },
      { serviceCode: 'SRV-AGG-003', name: 'Berat Jenis Agregat', standard: 'SNI', unit: '-' },
      { serviceCode: 'SRV-AGG-003', name: 'Penyerapan Air', standard: 'SNI', unit: '%' },
      { serviceCode: 'SRV-AGG-004', name: 'Kadar Lumpur', standard: 'SNI 4141:2015', unit: '%' },

      // ── ASPHALT TESTING ──
      { serviceCode: 'SRV-ASP-001', name: 'Stabilitas Marshall', standard: 'SNI 06-2489-1991', unit: 'kg' },
      { serviceCode: 'SRV-ASP-001', name: 'Flow', standard: 'SNI 06-2489-1991', unit: 'mm' },
      { serviceCode: 'SRV-ASP-001', name: 'MQ', standard: 'SNI 06-2489-1991', unit: 'kg/mm' },
      { serviceCode: 'SRV-ASP-001', name: 'VIM', standard: 'SNI 06-2489-1991', unit: '%' },
      { serviceCode: 'SRV-ASP-002', name: 'Penetrasi Bitumen', standard: 'SNI 2456:2011', unit: 'mm (0.1)' },
      { serviceCode: 'SRV-ASP-003', name: 'Titik Lembek', standard: 'SNI 2434:2011', unit: '°C' },
      { serviceCode: 'SRV-ASP-004', name: 'Kadar Aspal', standard: 'SNI 03-3640-1994', unit: '%' },
      { serviceCode: 'SRV-ASP-004', name: 'Gradasi Agregat Ekstraksi', standard: 'SNI 03-3640-1994', unit: '%' },

      // ── FIELD TESTING ──
      { serviceCode: 'SRV-FIELD-001', name: 'Nilai CBR Lapangan', standard: 'SNI', unit: '%' },
      { serviceCode: 'SRV-FIELD-002', name: 'Kepadatan Lapangan', standard: 'SNI 03-2828-1992', unit: 'g/cm³' },
      { serviceCode: 'SRV-FIELD-002', name: 'Derajat Pemadatan', standard: 'SNI 03-2828-1992', unit: '%' },
      { serviceCode: 'SRV-FIELD-003', name: 'DCP Value', standard: 'SNI', unit: 'mm/blow' },
      { serviceCode: 'SRV-FIELD-003', name: 'CBR Estimasi DCP', standard: 'SNI', unit: '%' },
    ];

    for (const p of params) {
      await queryRunner.query(
        `INSERT INTO testing_parameters (testing_service_id, name, standard, unit, is_active)
         SELECT id, $2, $3, $4, TRUE
         FROM testing_services
         WHERE code = $1
         ON CONFLICT DO NOTHING`,
        [p.serviceCode, p.name, p.standard, p.unit],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM testing_parameters');
  }
}
