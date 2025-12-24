import { Column, Entity, PrimaryColumn, Index, CreateDateColumn, OneToMany, UpdateDateColumn } from "typeorm";
import { Cuti } from "../cuti/cuti.entity";

@Entity()
export class Pegawai {
    @Column()
    nama_depan: string;

    @Column()
    nama_belakang: string;

    @Index()
    @PrimaryColumn({unique: true})
    email: string;

    @Column()
    no_hp: string;

    @Column("text")
    alamat: string;

    @Column({
        type: "enum",
        enum: ['L','P'],
        default: "L"
    })
    jenis_kelamin: string;

    @OneToMany(() => Cuti, (cuti) => cuti.pegawai)
    on_leave: Cuti[];

    @CreateDateColumn({type: 'timestamp'})
    created_at : Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at : Date;

    constructor(pegawai: Partial<Pegawai>) {
        Object.assign(this, pegawai)
    }
}