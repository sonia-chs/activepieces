import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddImageAndPdfToTodo1758972000000 implements MigrationInterface {
    name = 'AddImageAndPdfToTodo1758972000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "todo"
            ADD "image" character varying
        `)
        await queryRunner.query(`
            ALTER TABLE "todo"
            ADD "pdf" character varying
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "todo" DROP COLUMN "pdf"
        `)
        await queryRunner.query(`
            ALTER TABLE "todo" DROP COLUMN "image"
        `)
    }

}
