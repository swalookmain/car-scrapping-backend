import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiftingController } from './lifting.controller';
import { LiftingService } from './lifting.service';
import { LiftingJobRepository } from './lifting-job.repository';
import { LiftingJob, LiftingJobSchema } from './lifting-job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiftingJob.name, schema: LiftingJobSchema },
    ]),
  ],
  controllers: [LiftingController],
  providers: [LiftingService, LiftingJobRepository],
  exports: [LiftingService],
})
export class LiftingModule {}
