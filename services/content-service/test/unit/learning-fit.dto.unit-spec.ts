/// <reference types="jest" />

import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LearningFitDto, toLearningFit } from '../../src/presentation/http/dtos/learning-fit.dto';
import {
  FitEvidenceSourceType,
  FitStatus,
  LearningFitDifficulty,
  StartHereTargetType,
} from '../../src/domain/entities/learning-fit';

describe('LearningFitDto', () => {
  it('computes VERIFIED when required fit sections are present', async () => {
    const dto = plainToInstance(LearningFitDto, {
      bestFor: ['Students reviewing derivatives before midterm'],
      notFor: ['Students looking for full exam solutions'],
      startHere: [
        {
          title: 'Review the concept recap',
          order: 2,
          targetType: StartHereTargetType.AI_PROMPT,
          aiPrompt: 'Quiz me on common mistakes',
        },
        {
          title: 'Try the worked example',
          order: 1,
        },
      ],
      difficulty: LearningFitDifficulty.INTERMEDIATE,
      fitEvidence: [
        {
          claim: 'The draft is based on extracted resource metadata',
          sourceType: FitEvidenceSourceType.CONTENT_EXTRACTION,
          sourceRef: 'resource:derivatives',
          confidence: 0.81,
        },
      ],
      fitGeneratedAt: '2026-06-16T10:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(toLearningFit(dto)).toMatchObject({
      fitStatus: FitStatus.VERIFIED,
      difficulty: LearningFitDifficulty.INTERMEDIATE,
      fitEvidence: [
        {
          claim: 'The draft is based on extracted resource metadata',
          sourceType: FitEvidenceSourceType.CONTENT_EXTRACTION,
          sourceRef: 'resource:derivatives',
          confidence: 0.81,
        },
      ],
      startHere: [
        { title: 'Try the worked example', order: 1 },
        { title: 'Review the concept recap', order: 2 },
      ],
    });
  });

  it('requires evidence before marking a complete fit as VERIFIED', async () => {
    const dto = plainToInstance(LearningFitDto, {
      bestFor: ['Students reviewing derivatives before midterm'],
      notFor: ['Students looking for full exam solutions'],
      startHere: [{ title: 'Try the worked example', order: 1 }],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(toLearningFit(dto)).toMatchObject({
      fitStatus: FitStatus.NEEDS_EVIDENCE,
      bestFor: ['Students reviewing derivatives before midterm'],
      notFor: ['Students looking for full exam solutions'],
    });
  });

  it('keeps partial fit metadata in DRAFT instead of rejecting it', async () => {
    const dto = plainToInstance(LearningFitDto, {
      coveredTopics: ['Derivatives', 'Chain rule'],
      estimatedStudyTimeMinutes: 45,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(toLearningFit(dto)).toMatchObject({
      fitStatus: FitStatus.DRAFT,
      bestFor: [],
      notFor: [],
      startHere: [],
      coveredTopics: ['Derivatives', 'Chain rule'],
      estimatedStudyTimeMinutes: 45,
    });
  });

  it('rejects too many best-for claims', async () => {
    const dto = plainToInstance(LearningFitDto, {
      bestFor: [
        'Students reviewing topic one',
        'Students reviewing topic two',
        'Students reviewing topic three',
        'Students reviewing topic four',
        'Students reviewing topic five',
        'Students reviewing topic six',
      ],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'bestFor')).toBe(true);
  });
});
