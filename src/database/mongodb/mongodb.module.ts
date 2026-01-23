import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('database.mongoUri');
        const logger = new Logger('MongoDB');

        if (!uri) {
          logger.error('❌ MONGO_URI is not set in environment variables!');
          throw new Error('MONGO_URI is required');
        }

        logger.log(
          `🔌 Connecting to MongoDB: ${uri.replace(/\/\/.*@/, '//***:***@')}`,
        );

        return {
          uri,
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              logger.log('✅ Successfully connected to MongoDB');
            });
            connection.on('error', (err: Error) => {
              logger.error(
                `❌ MongoDB connection error: ${err.message || 'Unknown error'}`,
              );
            });
            connection.on('disconnected', () => {
              logger.warn('⚠️ MongoDB disconnected');
            });
            return connection;
          },
        };
      },
    }),
  ],
})
export class MongoDbModule implements OnModuleInit {
  private readonly logger = new Logger(MongoDbModule.name);

  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = Number(this.connection.readyState);
    if (readyState === 1) {
      this.logger.log(
        `✅ MongoDB connected to database: ${this.connection.db?.databaseName}`,
      );
    } else {
      this.logger.warn(
        `⚠️ MongoDB connection not ready (state: ${readyState})`,
      );
    }
  }
}
