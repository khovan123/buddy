/** Enum representing major status values. */
export enum MajorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

/** Interface representing data constraints for  major props. */
export interface MajorProps {
  id: string;
  code: string;
  name: string;
  description: string;
  status: MajorStatus;
  deletedAt?: Date;
}

/** Domain Entity representing a major. */
export class MajorEntity {
  private props: MajorProps;

  private constructor(props: MajorProps) {
    this.props = props;
  }

  /**
   * Creates a new MajorEntity.
   *
   * @param params - The creation parameters
   * @returns A new MajorEntity instance
   */
  static create(params: { code: string; name: string; description: string }): MajorEntity {
    return new MajorEntity({
      id: '',
      code: params.code,
      name: params.name,
      description: params.description,
      status: MajorStatus.ACTIVE,
    });
  }

  /**
   * Reconstitutes a MajorEntity from persisted data.
   *
   * @param props - The persisted props
   * @returns A reconstituted MajorEntity instance
   */
  static reconstitute(props: MajorProps): MajorEntity {
    return new MajorEntity(props);
  }

  get id(): string {
    return this.props.id;
  }

  set id(value: string) {
    this.props.id = value;
  }

  get code(): string {
    return this.props.code;
  }

  set code(value: string) {
    this.props.code = value;
  }

  get name(): string {
    return this.props.name;
  }

  set name(value: string) {
    this.props.name = value;
  }

  get description(): string {
    return this.props.description;
  }

  set description(value: string) {
    this.props.description = value;
  }

  get status(): MajorStatus {
    return this.props.status;
  }

  set status(value: MajorStatus) {
    this.props.status = value;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  set deletedAt(value: Date | undefined) {
    this.props.deletedAt = value;
  }
}
