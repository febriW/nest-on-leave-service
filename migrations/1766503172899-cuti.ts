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
            ('Sakit', '2025-01-05', '2025-01-05', 'rina@gmail.com'),
            ('Liburan', '2025-03-12', '2025-03-12', 'rina@gmail.com'),
            ('Keperluan Keluarga', '2025-06-20', '2025-06-20', 'rina@gmail.com'),
            ('Sakit', '2025-09-10', '2025-09-10', 'rina@gmail.com'),
            ('Liburan', '2025-02-14', '2025-02-14', 'agus@gmail.com'),
            ('Sakit', '2025-05-08', '2025-05-08', 'agus@gmail.com'),
            ('Keperluan Keluarga', '2025-08-22', '2025-08-22', 'agus@gmail.com'),
            ('Sakit', '2025-01-20', '2025-01-20', 'dewi@gmail.com'),
            ('Liburan', '2025-04-10', '2025-04-10', 'dewi@gmail.com'),
            ('Keperluan Keluarga', '2025-07-15', '2025-07-15', 'dewi@gmail.com'),
            ('Sakit', '2025-10-12', '2025-10-12', 'dewi@gmail.com'),
            ('Liburan', '2025-12-25', '2025-12-25', 'dewi@gmail.com'),
            ('Keperluan Keluarga', '2025-03-05', '2025-03-05', 'fajar@gmail.com'),
            ('Sakit', '2025-06-11', '2025-06-11', 'fajar@gmail.com'),
            ('Liburan', '2025-09-20', '2025-09-20', 'fajar@gmail.com'),
            ('Sakit', '2025-04-07', '2025-04-07', 'hendra@gmail.com'),
            ('Keperluan Keluarga', '2025-07-16', '2025-07-16', 'hendra@gmail.com'),
            ('Liburan', '2025-10-22', '2025-10-22', 'hendra@gmail.com'),
            ('Keperluan Keluarga', '2025-01-15', '2025-01-15', 'maya@gmail.com'),
            ('Sakit', '2025-03-18', '2025-03-18', 'maya@gmail.com'),
            ('Liburan', '2025-06-25', '2025-06-25', 'maya@gmail.com'),
            ('Sakit', '2025-09-05', '2025-09-05', 'maya@gmail.com'),
            ('Liburan', '2025-03-08', '2025-03-08', 'bayu@gmail.com'),
            ('Sakit', '2025-06-02', '2025-06-02', 'bayu@gmail.com'),
            ('Keperluan Keluarga', '2025-09-17', '2025-09-17', 'bayu@gmail.com'),
            ('Sakit', '2025-01-11', '2025-01-11', 'nina@gmail.com'),
            ('Liburan', '2025-04-21', '2025-04-21', 'nina@gmail.com'),
            ('Keperluan Keluarga', '2025-07-30', '2025-07-30', 'nina@gmail.com'),
            ('Sakit', '2025-10-19', '2025-10-19', 'nina@gmail.com'),
            ('Liburan', '2025-02-05', '2025-02-05', 'doni@gmail.com'),
            ('Sakit', '2025-05-15', '2025-05-15', 'doni@gmail.com'),
            ('Keperluan Keluarga', '2025-08-09', '2025-08-09', 'doni@gmail.com'),
            ('Sakit', '2025-01-10', '2025-01-10', 'lina@gmail.com'),
            ('Liburan', '2025-02-15', '2025-02-15', 'lina@gmail.com'),
            ('Keperluan Keluarga', '2025-03-12', '2025-03-12', 'lina@gmail.com'),
            ('Sakit', '2025-04-08', '2025-04-08', 'lina@gmail.com'),
            ('Liburan', '2025-05-20', '2025-05-20', 'lina@gmail.com'),
            ('Keperluan Keluarga', '2025-06-18', '2025-06-18', 'lina@gmail.com'),
            ('Sakit', '2025-07-22', '2025-07-22', 'lina@gmail.com'),
            ('Liburan', '2025-08-05', '2025-08-05', 'lina@gmail.com'),
            ('Keperluan Keluarga', '2025-09-14', '2025-09-14', 'lina@gmail.com'),
            ('Sakit', '2025-10-10', '2025-10-10', 'lina@gmail.com'),
            ('Liburan', '2025-11-08', '2025-11-08', 'lina@gmail.com'),
            ('Keperluan Keluarga', '2025-12-25', '2025-12-25', 'lina@gmail.com')
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
