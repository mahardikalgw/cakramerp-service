import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDepartmentsAndPositions20250527000003 implements MigrationInterface {
  name = 'SeedDepartmentsAndPositions20250527000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed departments
    await queryRunner.query(`
      INSERT INTO departments (name, description, is_active)
      VALUES
        ('Engineering', 'Software development and engineering team', true),
        ('Human Resources', 'HR and people operations', true),
        ('Finance', 'Finance and accounting department', true),
        ('Marketing', 'Marketing and communications', true),
        ('Operations', 'Business operations and logistics', true),
        ('Sales', 'Sales and business development', true),
        ('Legal', 'Legal and compliance', true),
        ('IT Support', 'IT infrastructure and support', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed positions linked to departments
    await queryRunner.query(`
      INSERT INTO positions (name, department_id, description, is_active)
      VALUES
        ('Software Engineer', (SELECT id FROM departments WHERE name = 'Engineering'), 'Develops and maintains software applications', true),
        ('Senior Software Engineer', (SELECT id FROM departments WHERE name = 'Engineering'), 'Senior-level software development role', true),
        ('Tech Lead', (SELECT id FROM departments WHERE name = 'Engineering'), 'Technical leadership and architecture', true),
        ('Engineering Manager', (SELECT id FROM departments WHERE name = 'Engineering'), 'Manages engineering teams', true),
        ('QA Engineer', (SELECT id FROM departments WHERE name = 'Engineering'), 'Quality assurance and testing', true),
        ('HR Manager', (SELECT id FROM departments WHERE name = 'Human Resources'), 'Manages HR operations', true),
        ('HR Staff', (SELECT id FROM departments WHERE name = 'Human Resources'), 'General HR administration', true),
        ('Recruiter', (SELECT id FROM departments WHERE name = 'Human Resources'), 'Talent acquisition', true),
        ('Finance Manager', (SELECT id FROM departments WHERE name = 'Finance'), 'Manages finance operations', true),
        ('Accountant', (SELECT id FROM departments WHERE name = 'Finance'), 'Handles accounting and bookkeeping', true),
        ('Tax Specialist', (SELECT id FROM departments WHERE name = 'Finance'), 'Tax compliance and reporting', true),
        ('Marketing Manager', (SELECT id FROM departments WHERE name = 'Marketing'), 'Manages marketing strategy', true),
        ('Content Writer', (SELECT id FROM departments WHERE name = 'Marketing'), 'Creates marketing content', true),
        ('Graphic Designer', (SELECT id FROM departments WHERE name = 'Marketing'), 'Visual design and branding', true),
        ('Operations Manager', (SELECT id FROM departments WHERE name = 'Operations'), 'Manages daily operations', true),
        ('Warehouse Staff', (SELECT id FROM departments WHERE name = 'Operations'), 'Warehouse operations', true),
        ('Logistics Coordinator', (SELECT id FROM departments WHERE name = 'Operations'), 'Coordinates logistics and delivery', true),
        ('Sales Manager', (SELECT id FROM departments WHERE name = 'Sales'), 'Manages sales team', true),
        ('Sales Executive', (SELECT id FROM departments WHERE name = 'Sales'), 'Handles client sales', true),
        ('Account Manager', (SELECT id FROM departments WHERE name = 'Sales'), 'Manages client accounts', true),
        ('Legal Counsel', (SELECT id FROM departments WHERE name = 'Legal'), 'Legal advisory and compliance', true),
        ('IT Support Specialist', (SELECT id FROM departments WHERE name = 'IT Support'), 'Technical support and helpdesk', true),
        ('System Administrator', (SELECT id FROM departments WHERE name = 'IT Support'), 'Server and infrastructure management', true)
      ON CONFLICT (name, department_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM positions;`);
    await queryRunner.query(`DELETE FROM departments;`);
  }
}
