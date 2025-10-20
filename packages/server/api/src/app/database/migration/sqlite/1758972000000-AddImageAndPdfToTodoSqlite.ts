import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddImageAndPdfToTodoSqlite1758972000000 implements MigrationInterface {
    name = 'AddImageAndPdfToTodoSqlite1758972000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "todo"
            ADD "image" varchar
        `)
        await queryRunner.query(`
            ALTER TABLE "todo"
            ADD "pdf" varchar
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
