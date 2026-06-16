/// <reference types="jest" />

import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { CreateCollectionCommand } from '../../src/application/commands/create-collection.command';
import { CreateResourceCommand } from '../../src/application/commands/create-resource.command';
import { CreateTutorialCommand } from '../../src/application/commands/create-tutorial.command';
import { UpdateCollectionCommand } from '../../src/application/commands/update-collection.command';
import { UpdateResourceCommand } from '../../src/application/commands/update-resource.command';
import { UpdateTutorialCommand } from '../../src/application/commands/update-tutorial.command';
import { GetCollectionByIdQuery } from '../../src/application/queries/get-collection-by-id.query';
import { GetResourceByIdQuery } from '../../src/application/queries/get-resource-by-id.query';
import { GetResourceBySlugQuery } from '../../src/application/queries/get-resource-by-slug.query';
import { GetTutorialBySlugQuery } from '../../src/application/queries/get-tutorial-by-slug.query';
import { CollectionType } from '../../src/infrastructure/persistence/mongo/schemas/collection.schema';
import { CollectionController } from '../../src/presentation/http/controllers/collection.controller';
import { ResourceController } from '../../src/presentation/http/controllers/resource.controller';
import { TutorialController } from '../../src/presentation/http/controllers/tutorial.controller';
import { CreateCollectionDto } from '../../src/presentation/http/dtos/create-collection.dto';
import { CreateResourceDto } from '../../src/presentation/http/dtos/create-resource.dto';
import { CreateTutorialDto } from '../../src/presentation/http/dtos/create-tutorial.dto';
import { FitEvidenceDto, LearningFitDto } from '../../src/presentation/http/dtos/learning-fit.dto';
import { UpdateCollectionDto } from '../../src/presentation/http/dtos/update-collection.dto';
import { UpdateResourceDto } from '../../src/presentation/http/dtos/update-resource.dto';
import { UpdateTutorialDto } from '../../src/presentation/http/dtos/update-tutorial.dto';
import {
  FitEvidenceSourceType,
  FitStatus,
  LearningFitDifficulty,
  StartHereTargetType,
} from '../../src/domain/entities/learning-fit';

const req = { user: { sub: 'creator-1' } } as never;

const commandBus = () =>
  ({
    execute: jest.fn().mockResolvedValue({ id: 'created-id' }),
  }) as unknown as jest.Mocked<CommandBus>;

const queryBus = () =>
  ({
    execute: jest.fn().mockResolvedValue({ id: 'content-id' }),
  }) as unknown as jest.Mocked<QueryBus>;

const fitEvidence = (): FitEvidenceDto[] => [
  {
    claim: 'Draft generated from extracted content metadata',
    sourceType: FitEvidenceSourceType.CONTENT_EXTRACTION,
    sourceRef: 'resource:calculus-review',
    confidence: 0.82,
  },
];

const completeFit = (evidence: FitEvidenceDto[] = fitEvidence()): LearningFitDto => ({
  bestFor: ['Students preparing for a calculus midterm'],
  notFor: ['Students looking for complete exam answers'],
  startHere: [
    {
      title: 'Read the recap',
      order: 1,
      targetType: StartHereTargetType.AI_PROMPT,
      aiPrompt: 'Quiz me on derivative mistakes',
    },
  ],
  coveredTopics: ['Derivatives'],
  notCoveredTopics: ['Full course replacement'],
  learningOutcomes: ['Solve common derivative exercises'],
  estimatedStudyTimeMinutes: 45,
  difficulty: LearningFitDifficulty.INTERMEDIATE,
  fitEvidence: evidence,
  fitGeneratedAt: '2026-06-16T10:00:00.000Z',
  fitVerifiedAt: '2026-06-16T10:00:00.000Z',
});

describe('LearningFit controller contract', () => {
  it('passes evidence-backed fit metadata through Resource create/update commands', async () => {
    const commands = commandBus();
    const controller = new ResourceController(commands, queryBus());
    const dto = {
      title: 'Calculus Review',
      summary: 'A focused review resource for derivatives.',
      hightlights: ['Worked derivative examples'],
      majorId: 'major-1',
      courseId: 'course-1',
      price: 10000,
      files: [{ fileName: 'review.pdf', fileSizeBytes: 1024, mimeType: 'application/pdf' }],
      learningFit: completeFit(),
    } as CreateResourceDto;

    await controller.createResource(dto, req);
    await controller.updateResource({ id: 'resource-1' }, dto as unknown as UpdateResourceDto, req);

    const createCommand = commands.execute.mock.calls[0][0] as CreateResourceCommand;
    const updateCommand = commands.execute.mock.calls[1][0] as UpdateResourceCommand;

    expect(createCommand.learningFit).toMatchObject({
      fitStatus: FitStatus.VERIFIED,
      fitEvidence: [{ sourceType: FitEvidenceSourceType.CONTENT_EXTRACTION }],
    });
    expect(updateCommand.learningFit).toMatchObject({
      fitStatus: FitStatus.VERIFIED,
      fitEvidence: [{ sourceRef: 'resource:calculus-review' }],
    });
  });

  it('passes complete but non-evidenced tutorial fit metadata as NEEDS_EVIDENCE', async () => {
    const commands = commandBus();
    const controller = new TutorialController(commands, queryBus());
    const dto = {
      title: 'Derivatives Tutorial',
      description: 'A guided tutorial for common derivative mistakes.',
      hightlights: ['Video walkthroughs'],
      majorId: 'major-1',
      courseId: 'course-1',
      price: 15000,
      discountBundle: 0,
      fileName: 'lesson.mp4',
      fileSizeBytes: 2048,
      videoDurationSeconds: 900,
      steps: [],
      learningFit: completeFit([]),
    } as CreateTutorialDto;

    await controller.createTutorial(dto, req);
    await controller.updateTutorial({ id: 'tutorial-1' }, dto as unknown as UpdateTutorialDto, req);

    const createCommand = commands.execute.mock.calls[0][0] as CreateTutorialCommand;
    const updateCommand = commands.execute.mock.calls[1][0] as UpdateTutorialCommand;

    expect(createCommand.learningFit?.fitStatus).toBe(FitStatus.NEEDS_EVIDENCE);
    expect(updateCommand.learningFit?.fitStatus).toBe(FitStatus.NEEDS_EVIDENCE);
    expect(updateCommand.learningFit?.fitVerifiedAt).toBeNull();
  });

  it('passes collection path fit metadata and phases through collection commands', async () => {
    const commands = commandBus();
    const controller = new CollectionController(commands, queryBus());
    const dto = {
      title: 'Exam Prep Path',
      description: 'A focused collection for exam preparation.',
      hightlights: ['Checkpoint-based study plan'],
      majorId: 'major-1',
      courseId: 'course-1',
      resourceIds: ['resource-1'],
      tutorialIds: [],
      type: CollectionType.RESOURCE,
      discount: 10,
      phases: [
        {
          phaseTitle: 'Foundation',
          learningGoal: 'Review the basics',
          items: [{ itemId: 'resource-1', itemType: 'RESOURCE' }],
        },
      ],
      learningFit: completeFit(),
    } as CreateCollectionDto;

    await controller.createCollection(dto, req);
    await controller.updateCollection(
      { id: 'collection-1' },
      dto as unknown as UpdateCollectionDto,
      req,
    );

    const createCommand = commands.execute.mock.calls[0][0] as CreateCollectionCommand;
    const updateCommand = commands.execute.mock.calls[1][0] as UpdateCollectionCommand;

    expect(createCommand.learningFit?.fitStatus).toBe(FitStatus.VERIFIED);
    expect(createCommand.phases).toEqual([
      {
        phaseTitle: 'Foundation',
        learningGoal: 'Review the basics',
        items: [{ itemId: 'resource-1', itemType: 'RESOURCE' }],
      },
    ]);
    expect(updateCommand.learningFit?.fitEvidence).toHaveLength(1);
  });

  it('returns query results with learningFit unchanged on resource/tutorial/collection fetches', async () => {
    const queries = queryBus();
    const learningFit = {
      ...completeFit(),
      fitStatus: FitStatus.VERIFIED,
    };
    queries.execute.mockResolvedValue({ id: 'content-id', learningFit });

    const resourceController = new ResourceController(commandBus(), queries);
    const tutorialController = new TutorialController(commandBus(), queries);
    const collectionController = new CollectionController(commandBus(), queries);

    await expect(resourceController.getResource('64f000000000000000000001')).resolves.toMatchObject(
      {
        data: { learningFit },
      },
    );
    await expect(tutorialController.getTutorial('tutorial-slug')).resolves.toMatchObject({
      data: { learningFit },
    });
    await expect(
      collectionController.getCollectionById({ id: 'collection-1' }),
    ).resolves.toMatchObject({
      data: { learningFit },
    });

    expect(queries.execute.mock.calls[0][0]).toBeInstanceOf(GetResourceByIdQuery);
    expect(queries.execute.mock.calls[1][0]).toBeInstanceOf(GetTutorialBySlugQuery);
    expect(queries.execute.mock.calls[2][0]).toBeInstanceOf(GetCollectionByIdQuery);
  });

  it('uses slug query path for non-ObjectId resource fetches', async () => {
    const queries = queryBus();
    const controller = new ResourceController(commandBus(), queries);

    await controller.getResource('calculus-review');

    expect(queries.execute.mock.calls[0][0]).toBeInstanceOf(GetResourceBySlugQuery);
  });
});
