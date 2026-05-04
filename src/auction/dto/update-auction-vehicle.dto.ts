import { PartialType } from '@nestjs/swagger';
import { CreateAuctionVehicleDto } from './create-auction-vehicle.dto';

export class UpdateAuctionVehicleDto extends PartialType(CreateAuctionVehicleDto) {}
