import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class Cuti1766503172899 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Buat tabel cuti
        await queryRunner.createTable(
            new Table({
                name: "cuti",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "alasan", type: "varchar", isNullable: false },
                    { name: "tanggal_mulai", type: "date", isNullable: false },
                    { name: "tanggal_selesai", type: "date", isNullable: false },
                    { name: "pegawaiEmail", type: "varchar", isNullable: false },
                    { name: "created_at", type: "timestamp", default: "CURRENT_TIMESTAMP" },
                    { name: "updated_at", type: "timestamp", default: "CURRENT_TIMESTAMP" }
                ]
            }),
            true
        );

        // Tambahkan foreign key ke pegawai
        await queryRunner.createForeignKey(
            "cuti",
            new TableForeignKey({
                columnNames: ["pegawaiEmail"],
                referencedColumnNames: ["email"],
                referencedTableName: "pegawai",
                onDelete: "CASCADE"
            })
        );

        // Insert sample 3 data cuti
        await queryRunner.query(`
            INSERT INTO cuti (alasan, tanggal_mulai, tanggal_selesai, pegawaiEmail)
            VALUES
            ('Sakit', '2025-01-10', '2025-01-10', 'budi@gmail.com'),
            ('Keperluan Keluarga', '2025-02-15', '2025-02-15', 'budi@gmail.com'),
            ('Sakit', '2025-02-08', '2025-02-08', 'siti@gmail.com'),
            ('Keperluan Keluarga', '2025-04-15', '2025-04-15', 'siti@gmail.com'),
            ('Sakit', '2025-05-20', '2025-05-20', 'siti@gmail.com'),
            ('Sakit', '2025-08-22', '2025-08-22', 'siti@gmail.com'),
            ('Liburan', '2025-01-02', '2025-01-02', 'andi@gmail.com'),
            ('Sakit', '2025-02-03', '2025-02-03', 'andi@gmail.com'),
            ('Keperluan Keluarga', '2025-03-06', '2025-03-06', 'andi@gmail.com'),
            ('Liburan', '2025-04-08', '2025-04-08', 'andi@gmail.com')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("cuti");
    if (table) { 
        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("pegawaiEmail") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("cuti", foreignKey);
        }

        await queryRunner.dropTable("cuti");
    }
}

}
