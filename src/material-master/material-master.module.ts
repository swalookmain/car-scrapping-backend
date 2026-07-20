import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MaterialMaster,
  MaterialMasterSchema,
} from './material-master.schema';
import { MaterialMasterRepository } from './material-master.repository';
import { MaterialMasterService } from './material-master.service';
import { MaterialMasterController } from './material-master.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialMaster.name, schema: MaterialMasterSchema },
    ]),
  ],
  controllers: [MaterialMasterController],
  providers: [MaterialMasterRepository, MaterialMasterService],
  exports: [MaterialMasterService, MaterialMasterRepository],
})
export class MaterialMasterModule {}
