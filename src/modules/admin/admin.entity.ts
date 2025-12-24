import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";
import * as bcrypt from "bcrypt"
import { JenisKelamin } from "./dto/admin.dto";
import { Exclude } from "class-transformer";

@Entity()
export class Admin {
    @Column()
    nama_depan: string;

    @Column()
    nama_belakang: string;

    @Index()
    @PrimaryColumn({default: 'admin@gmail.com', unique: true})
    email: string;

    @Column()
    tanggal_lahir: Date;

    @Column({
        type: "enum",
        enum: ['L','P'],
        default: "L"
    })
    jenis_kelamin: JenisKelamin;

    @Column()
    @Exclude()
    password: string;

    @CreateDateColumn({type: 'timestamp'})
    created_at : Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at : Date;

    @BeforeInsert()
    @BeforeUpdate()
    async hashingPassword() {
        this.password = await bcrypt.hash(this.password, 15)
    }

    constructor(admin: Partial<Admin>) {
        Object.assign(this, admin)
    }
}