/** Enum representing career status values. */
export enum CareerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

/** Interface representing data constraints for  career props. */
export interface CareerProps {
  id: string;
  name: string;
  description: string;
  status: CareerStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Domain Entity representing a career. */
export class Career {
  private props: CareerProps;

  private constructor(props: CareerProps) {
    this.props = props;
  }

  /**
   * Creates a new Career entity.
   *
   * @param params - The creation parameters
   * @returns A new Career instance
   */
  static create(params: { name: string; description: string }): Career {
    const now = new Date();
    return new Career({
      id: '',
      name: params.name,
      description: params.description,
      status: CareerStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a Career entity from persisted data.
   *
   * @param props - The persisted props
   * @returns A reconstituted Career instance
   */
  static reconstitute(props: CareerProps): Career {
    return new Career(props);
  }

  get id(): string {
    return this.props.id;
  }

  set id(value: string) {
    this.props.id = value;
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

  get status(): CareerStatus {
    return this.props.status;
  }

  set status(value: CareerStatus) {
    this.props.status = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  set createdAt(value: Date) {
    this.props.createdAt = value;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  set updatedAt(value: Date) {
    this.props.updatedAt = value;
  }
}
