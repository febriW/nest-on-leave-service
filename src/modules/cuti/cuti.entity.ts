import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Pegawai } from '../pegawai/pegawai.entity';

@Entity()
export class Cuti {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  alasan: string;

  @Column({ type: 'date' })
  tanggal_mulai: Date;

  @Column({ type: 'date' })
  tanggal_selesai: Date;

  @ManyToOne(() => Pegawai, (pegawai) => pegawai.on_leave, { onDelete: 'CASCADE' })
  pegawai: Pegawai;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
