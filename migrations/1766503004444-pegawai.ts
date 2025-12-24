import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class Pegawai1766503004444 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Buat tabel pegawai
        await queryRunner.createTable(
            new Table({
                name: "pegawai",
                columns: [
                    { name: "nama_depan", type: "varchar", isNullable: false },
                    { name: "nama_belakang", type: "varchar", isNullable: false },
                    { name: "email", type: "varchar", isPrimary: true, isUnique: true, default: "'admin@gmail.com'" },
                    { name: "no_hp", type: "varchar", length: "15", isNullable: false },
                    { name: "alamat", type: "text", isNullable: false },
                    { name: "jenis_kelamin", type: "enum", enum: ['L','P'], default: "'L'" },
                    { name: "created_at", type: "timestamp", default: "CURRENT_TIMESTAMP" },
                    { name: "updated_at", type: "timestamp", default: "CURRENT_TIMESTAMP" }
                ]
            }),
            true
        );

        await queryRunner.createIndex(
            "pegawai",
            new TableIndex({ name: "IDX_PEGAWAI_EMAIL", columnNames: ["email"] })
        );

        await queryRunner.query(`
            INSERT INTO pegawai (nama_depan, nama_belakang, email, no_hp, alamat, jenis_kelamin)
            VALUES
            ('Budi', 'Santoso', 'budi@gmail.com', '+6281234567890', 'Jl. Merdeka No.1', 'L'),
            ('Siti', 'Aminah', 'siti@gmail.com', '+6281234567891', 'Jl. Sudirman No.2', 'P'),
            ('Andi', 'Pratama', 'andi@gmail.com', '+6281234567892', 'Jl. Thamrin No.3', 'L')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("pegawai", "IDX_PEGAWAI_EMAIL");
        await queryRunner.dropTable("pegawai");
    }

}
