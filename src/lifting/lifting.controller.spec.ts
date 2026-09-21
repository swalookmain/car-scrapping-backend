jest.mock('./lifting.service', () => ({
  LiftingService: class LiftingService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { LiftingController } from './lifting.controller';
import { LiftingService } from './lifting.service';

describe('LiftingController', () => {
  let controller: LiftingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiftingController],
      providers: [
        {
          provide: LiftingService,
          useValue: { findAll: jest.fn(), findOne: jest.fn(), summary: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get(LiftingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
