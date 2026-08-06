import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  session_id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'jsonb', nullable: true })
  sources: any;

  @Column({ type: 'jsonb', nullable: true })
  suggested_questions: string[];

  @CreateDateColumn()
  timestamp: Date;
}
