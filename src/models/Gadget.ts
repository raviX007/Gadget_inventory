import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Gadget {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    codename: string;

    @Column({
        type: 'enum',
        enum: ['Active', 'Decommissioned', 'Destroyed'],
        default: 'Active'
    })
    status: 'Active' | 'Decommissioned' | 'Destroyed';

    @Column({ nullable: true })
    decommissionedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}