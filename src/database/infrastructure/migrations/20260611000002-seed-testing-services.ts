import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestingServices20260611000002 implements MigrationInterface {
  name = 'SeedTestingServices20260611000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const services = [
      // ── SOIL TESTING ──────────────────────────────────────────────────
      {
        code: 'SRV-SOIL-001',
        name: 'Uji Kadar Air Tanah (Water Content Test)',
        unitPrice: 150000,
        measurementUnit: 'sampel',
        description: 'Pengujian kadar air tanah sesuai SNI 1965:2008',
      },
      {
        code: 'SRV-SOIL-002',
        name: 'Uji Berat Jenis Tanah (Specific Gravity Test)',
        unitPrice: 200000,
        measurementUnit: 'sampel',
        description: 'Pengujian berat jenis tanah sesuai SNI 1964:2008',
      },
      {
        code: 'SRV-SOIL-003',
        name: 'Uji Analisis Saringan Tanah (Sieve Analysis)',
        unitPrice: 250000,
        measurementUnit: 'sampel',
        description:
          'Analisis distribusi ukuran butiran tanah sesuai SNI 3423:2008',
      },
      {
        code: 'SRV-SOIL-004',
        name: 'Uji Batas Atterberg (Atterberg Limits Test)',
        unitPrice: 300000,
        measurementUnit: 'sampel',
        description:
          'Pengujian batas cair dan batas plastis tanah sesuai SNI 1966:2008 dan SNI 1967:2008',
      },
      {
        code: 'SRV-SOIL-005',
        name: 'Uji Pemadatan Tanah (Proctor Compaction Test)',
        unitPrice: 350000,
        measurementUnit: 'sampel',
        description:
          'Pengujian pemadatan tanah metode standar sesuai SNI 1742:2008',
      },
      {
        code: 'SRV-SOIL-006',
        name: 'Uji CBR Laboratorium (Laboratory CBR Test)',
        unitPrice: 500000,
        measurementUnit: 'sampel',
        description:
          'Pengujian California Bearing Ratio di laboratorium sesuai SNI 1744:2012',
      },
      {
        code: 'SRV-SOIL-007',
        name: 'Uji Permeabilitas Tanah (Permeability Test)',
        unitPrice: 400000,
        measurementUnit: 'sampel',
        description:
          'Pengujian koefisien permeabilitas tanah dengan kepala tetap atau kepala turun',
      },
      {
        code: 'SRV-SOIL-008',
        name: 'Uji Geser Langsung (Direct Shear Test)',
        unitPrice: 450000,
        measurementUnit: 'sampel',
        description: 'Pengujian kuat geser tanah sesuai SNI 2813:2008',
      },
      {
        code: 'SRV-SOIL-009',
        name: 'Uji Triaxial UU (Unconsolidated Undrained Triaxial Test)',
        unitPrice: 700000,
        measurementUnit: 'sampel',
        description:
          'Pengujian triaksial tanpa konsolidasi dan tak terdrainasi sesuai SNI',
      },
      {
        code: 'SRV-SOIL-010',
        name: 'Uji Konsolidasi Tanah (Consolidation Test)',
        unitPrice: 800000,
        measurementUnit: 'sampel',
        description:
          'Pengujian pemampatan tanah satu dimensi sesuai SNI 2812:2011',
      },

      // ── CONCRETE TESTING ──────────────────────────────────────────────
      {
        code: 'SRV-BETON-001',
        name: 'Uji Slump Beton (Slump Test)',
        unitPrice: 100000,
        measurementUnit: 'pengujian',
        description: 'Pengujian workabilitas beton segar sesuai SNI 1972:2008',
      },
      {
        code: 'SRV-BETON-002',
        name: 'Uji Kuat Tekan Beton Silinder (Compressive Strength - Cylinder)',
        unitPrice: 150000,
        measurementUnit: 'benda uji',
        description:
          'Pengujian kuat tekan beton dengan benda uji silinder 15x30 cm sesuai SNI 1974:2011',
      },
      {
        code: 'SRV-BETON-003',
        name: 'Uji Kuat Tekan Beton Kubus (Compressive Strength - Cube)',
        unitPrice: 150000,
        measurementUnit: 'benda uji',
        description:
          'Pengujian kuat tekan beton dengan benda uji kubus 15x15x15 cm',
      },
      {
        code: 'SRV-BETON-004',
        name: 'Uji Kuat Lentur Beton (Flexural Strength Test)',
        unitPrice: 250000,
        measurementUnit: 'benda uji',
        description:
          'Pengujian kuat lentur beton dengan balok uji sesuai SNI 4431:2011',
      },
      {
        code: 'SRV-BETON-005',
        name: 'Uji Core Drill Beton (Core Drill Test)',
        unitPrice: 500000,
        measurementUnit: 'titik',
        description:
          'Pengambilan dan pengujian inti beton dari struktur eksisting',
      },
      {
        code: 'SRV-BETON-006',
        name: 'Uji Hammer Test Beton (Schmidt Hammer Test)',
        unitPrice: 200000,
        measurementUnit: 'titik',
        description:
          'Pengujian perkiraan kuat tekan beton non-destruktif dengan palu pantul',
      },

      // ── AGGREGATE TESTING ─────────────────────────────────────────────
      {
        code: 'SRV-AGG-001',
        name: 'Analisis Saringan Agregat (Aggregate Sieve Analysis)',
        unitPrice: 200000,
        measurementUnit: 'sampel',
        description:
          'Analisis gradasi agregat halus dan kasar sesuai SNI ASTM C136:2012',
      },
      {
        code: 'SRV-AGG-002',
        name: 'Uji Keausan Agregat Los Angeles (Los Angeles Abrasion Test)',
        unitPrice: 350000,
        measurementUnit: 'sampel',
        description:
          'Pengujian ketahanan aus agregat kasar sesuai SNI 2417:2008',
      },
      {
        code: 'SRV-AGG-003',
        name: 'Uji Berat Jenis Agregat (Aggregate Specific Gravity)',
        unitPrice: 200000,
        measurementUnit: 'sampel',
        description: 'Pengujian berat jenis dan penyerapan agregat halus/kasar',
      },
      {
        code: 'SRV-AGG-004',
        name: 'Uji Kadar Lumpur Agregat (Clay Content Test)',
        unitPrice: 150000,
        measurementUnit: 'sampel',
        description:
          'Pengujian kadar lumpur dan lempung dalam agregat sesuai SNI 4141:2015',
      },

      // ── ASPHALT TESTING ───────────────────────────────────────────────
      {
        code: 'SRV-ASP-001',
        name: 'Uji Marshall Aspal (Marshall Test)',
        unitPrice: 600000,
        measurementUnit: 'campuran',
        description:
          'Pengujian campuran beraspal dengan metode Marshall sesuai SNI 06-2489-1991',
      },
      {
        code: 'SRV-ASP-002',
        name: 'Uji Penetrasi Aspal (Penetration Test)',
        unitPrice: 200000,
        measurementUnit: 'sampel',
        description: 'Pengujian penetrasi bitumen sesuai SNI 2456:2011',
      },
      {
        code: 'SRV-ASP-003',
        name: 'Uji Titik Lembek Aspal (Softening Point Test)',
        unitPrice: 200000,
        measurementUnit: 'sampel',
        description: 'Pengujian titik lembek bitumen sesuai SNI 2434:2011',
      },
      {
        code: 'SRV-ASP-004',
        name: 'Uji Ekstraksi Aspal (Asphalt Extraction Test)',
        unitPrice: 400000,
        measurementUnit: 'sampel',
        description:
          'Pengujian kadar aspal dalam campuran beraspal sesuai SNI 03-3640-1994',
      },

      // ── FIELD TESTING ─────────────────────────────────────────────────
      {
        code: 'SRV-FIELD-001',
        name: 'Uji CBR Lapangan (Field CBR Test)',
        unitPrice: 750000,
        measurementUnit: 'titik',
        description: 'Pengujian CBR langsung di lapangan',
      },
      {
        code: 'SRV-FIELD-002',
        name: 'Uji Sandcone (Sand Cone Test)',
        unitPrice: 400000,
        measurementUnit: 'titik',
        description:
          'Pengujian kepadatan tanah di lapangan dengan metode kerucut pasir sesuai SNI 03-2828-1992',
      },
      {
        code: 'SRV-FIELD-003',
        name: 'Uji DCP (Dynamic Cone Penetrometer Test)',
        unitPrice: 500000,
        measurementUnit: 'titik',
        description: 'Pengujian daya dukung tanah lapangan dengan DCP',
      },
    ];

    for (const svc of services) {
      await queryRunner.query(
        `INSERT INTO testing_services (code, name, unit_price, measurement_unit, description, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (code) DO NOTHING`,
        [
          svc.code,
          svc.name,
          svc.unitPrice,
          svc.measurementUnit,
          svc.description,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM testing_services
      WHERE code LIKE 'SRV-SOIL-%'
         OR code LIKE 'SRV-BETON-%'
         OR code LIKE 'SRV-AGG-%'
         OR code LIKE 'SRV-ASP-%'
         OR code LIKE 'SRV-FIELD-%'
    `);
  }
}
