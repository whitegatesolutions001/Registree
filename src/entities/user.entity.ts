import { ApiProperty } from '@nestjs/swagger';
import { hashPassword, sendEmail } from '@utils/functions/utils.function';
import { AppRole, DefaultPassportLink } from '@utils/types/utils.constant';
import {
  AfterInsert,
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidV4 } from 'uuid';

@Entity('USER')
export class User extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 20 })
  firstName: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 20 })
  lastName: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 50, nullable: true })
  phoneNumber: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({ enum: AppRole })
  @Column({ enum: AppRole, default: AppRole.CUSTOMER })
  role: AppRole;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  uniqueVerificationCode: string;

  @ApiProperty()
  @Column({ type: 'text', default: DefaultPassportLink.male })
  profileImageUrl: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  status: boolean;

  @ApiProperty()
  @CreateDateColumn()
  dateCreated: Date;

  @ApiProperty()
  @UpdateDateColumn()
  dateUpdated: Date;

  @BeforeInsert()
  async beforeInsertHandler(): Promise<void> {
    this.id = uuidV4();
    this.firstName = this.firstName?.toLocaleLowerCase();
    this.lastName = this.lastName?.toLocaleLowerCase();
    this.email = this.email?.toLowerCase();
    const setPassword = this.password ?? '12345';
    this.password = await hashPassword(setPassword);
    if (this.role === AppRole.ADMIN) {
      this.status = true;
    }
  }

  @AfterInsert()
  afterInsertHandler(): void {
    setTimeout(async () => {
      if (this.role !== AppRole.ADMIN) {
        const htmlEmailTemplate = `
          <h2>Please copy the code below to verify your account</h2>
          <h3>${this.uniqueVerificationCode}</h3>
        `;
        await sendEmail(htmlEmailTemplate, 'Verify Account', [this.email]);
      }
    }, 5000);
  }
}
