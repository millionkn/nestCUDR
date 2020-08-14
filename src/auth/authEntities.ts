import { PrimaryGeneratedColumn, Entity, Column, ManyToMany, JoinTable, OneToOne, JoinColumn } from "typeorm";
import { ID } from "src/cudr/cudr.module";

let UserClass: any = null;
export function AccountRelated(): ClassDecorator {
  return (klass) => {
    UserClass = ()=>klass;
  }
}

@Entity()
export class AccountEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  id!: ID;
  @Column()
  username!: string;
  @Column({ select: false })
  password!: string;
  @ManyToMany(() => GroupEntity, { eager: true })
  @JoinTable()
  groups!: GroupEntity[]
  @JoinColumn()
  @OneToOne(() => UserClass())
  related!: T
}

@Entity()
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID;
  @Column()
  name!: string;
  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable()
  roles!: RoleEntity[]
}

@Entity()
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID;
  @Column()
  name!: string;
}