import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** Service handling business logic for  mongo. */
@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    try {
      await this.connection.asPromise();

      if (!this.connection.db) {
        throw new Error('MongoDB native db handle is not available');
      }

      await this.connection.db.admin().ping();
      this.logger.log('MongoDB connection is healthy');
    } catch (error) {
      this.logger.error('MongoDB connection ping failed', error as Error);
      throw error;
    }
  }

  /**
   * Executes the get connection operation.
   *
   * @returns Result of type Connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Executes the is connected operation.
   *
   * @returns Result of type boolean
   */
  isConnected(): boolean {
    return this.connection.readyState === 1;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection.readyState === 1) {
      await this.connection.close();
    }
  }
}
