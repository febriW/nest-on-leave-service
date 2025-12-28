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
            ('Rina', 'Putri', 'rina@gmail.com', '+6281234567893', 'Jl. Gatot Subroto No.4', 'P'),
            ('Agus', 'Haryanto', 'agus@gmail.com', '+6281234567894', 'Jl. Diponegoro No.5', 'L'),
            ('Dewi', 'Lestari', 'dewi@gmail.com', '+6281234567895', 'Jl. Hayam Wuruk No.6', 'P'),
            ('Fajar', 'Wijaya', 'fajar@gmail.com', '+6281234567896', 'Jl. Pemuda No.7', 'L'),
            ('Hendra', 'Saputra', 'hendra@gmail.com', '+6281234567898', 'Jl. Sudirman No.9', 'L'),
            ('Maya', 'Kusuma', 'maya@gmail.com', '+6281234567899', 'Jl. Merdeka No.10', 'P'),
            ('Bayu', 'Saputra', 'bayu@gmail.com', '+6281234567802', 'Jl. Diponegoro No.13', 'L'),
            ('Nina', 'Fauziah', 'nina@gmail.com', '+6281234567803', 'Jl. Hayam Wuruk No.14', 'P'),
            ('Doni', 'Pratama', 'doni@gmail.com', '+6281234567804', 'Jl. Pemuda No.15', 'L'),
            ('Lina', 'Prasetyo', 'lina@gmail.com', '+6281234567805', 'Jl. Merdeka No.16', 'P')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("pegawai", "IDX_PEGAWAI_EMAIL");
        await queryRunner.dropTable("pegawai");
    }

}
