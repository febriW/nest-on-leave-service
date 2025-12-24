import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";
import * as bcrypt from "bcrypt";

export class Admin1766477396753 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "admin",
                columns: [
                    {
                        name: "nama_depan",
                        type: "varchar",
                    },
                    {
                        name: "nama_belakang",
                        type: "varchar",
                    },
                    {
                        name: "email",
                        type: "varchar",
                        isPrimary: true,
                        isUnique: true,
                        default: "'testing@testing.com'",
                    },
                    {
                        name: "tanggal_lahir",
                        type: "timestamp",
                    },
                    {
                        name: "jenis_kelamin",
                        type: "enum",
                        enum: ['L','P'],
                        default: "'L'",
                    },
                    {
                        name: "password",
                        type: "varchar",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ]
            })
        )

        await queryRunner.createIndex(
            "admin",
            new TableIndex({
                name: "IDX_ADMIN_EMAIL",
                columnNames: ["email"]
            })
        );

        const password1 = await bcrypt.hash('strongpassword123', 10);

        await queryRunner.query(`
            INSERT INTO admin (nama_depan, nama_belakang, email, tanggal_lahir, jenis_kelamin, password)
            VALUES 
            ('Admin', 'Satu', 'admin@gmail.com', '1999-01-01 12:00:00', 'L', '${password1}')
        `)
    }

     public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("admin", "IDX_ADMIN_EMAIL");
        await queryRunner.dropTable("admin");
    }

}
