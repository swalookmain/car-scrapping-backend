import { PartialType } from '@nestjs/swagger';
import { CreateAuctionLotDto } from './create-auction-lot.dto';

export class UpdateAuctionLotDto extends PartialType(CreateAuctionLotDto) {}
