import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from './refresh-token.schema';

export interface RefreshTokenMetadata {
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
}

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async createRefreshToken(
    userId: string,
    token: string,
    metadata: RefreshTokenMetadata,
    expiresAt: Date,
  ): Promise<RefreshTokenDocument> {
    return this.refreshTokenModel.create({
      userId,
      token,
      ...metadata,
      expiresAt,
    });
  }

  async findRefreshToken(token: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({ token }).populate('userId');
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    const result = await this.refreshTokenModel.deleteOne({ token });
    return result.deletedCount > 0;
  }

  async deleteRefreshTokenByUserId(userId: string): Promise<number> {
    const result = await this.refreshTokenModel.deleteMany({ userId });
    return result.deletedCount;
  }

  async updateRefreshToken(
    oldToken: string,
    newToken: string,
    metadata: RefreshTokenMetadata,
    expiresAt: Date,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOneAndUpdate(
      { token: oldToken },
      {
        token: newToken,
        ...metadata,
        expiresAt,
      },
      { new: true },
    );
  }
}
