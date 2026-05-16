/** Enum representing highlight skill status values. */
export enum HighlightSkillStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

/** Interface representing data constraints for  highlight skill props. */
export interface HighlightSkillProps {
  id: string;
  name: string;
  careerId: string;
  career?: { id: string; name: string };
  status: HighlightSkillStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Domain Entity representing a highlight skill. */
export class HighlightSkill {
  private props: HighlightSkillProps;

  private constructor(props: HighlightSkillProps) {
    this.props = props;
  }

  /**
   * Creates a new HighlightSkill entity.
   *
   * @param params - The creation parameters
   * @returns A new HighlightSkill instance
   */
  static create(params: { name: string; careerId: string }): HighlightSkill {
    const now = new Date();
    return new HighlightSkill({
      id: '',
      name: params.name,
      careerId: params.careerId,
      status: HighlightSkillStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a HighlightSkill entity from persisted data.
   *
   * @param props - The persisted props
   * @returns A reconstituted HighlightSkill instance
   */
  static reconstitute(props: HighlightSkillProps): HighlightSkill {
    return new HighlightSkill(props);
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

  get careerId(): string {
    return this.props.careerId;
  }

  set careerId(value: string) {
    this.props.careerId = value;
  }

  get career(): { id: string; name: string } | undefined {
    return this.props.career;
  }

  get status(): HighlightSkillStatus {
    return this.props.status;
  }

  set status(value: HighlightSkillStatus) {
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
