import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  original_name: string;

  @Column({ default: 'processing' })
  status: string;

  @Column({ nullable: true })
  page_count: number;

  @CreateDateColumn()
  upload_date: Date;
}
