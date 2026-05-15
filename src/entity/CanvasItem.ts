import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class CanvasItem {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    userId!: number

    @Column()
    url!: string

    @Column()
    fingerprint!: string

    @Column()
    updatedAt!: Date

    @Column({type: 'simple-json'})
    position!: [number, number]

    @Column({type: 'simple-json'})
    dimensions!: [number, number]
}
