import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  TokenBlacklistService,
  BLACKLIST_REDIS_CLIENT,
} from './token-blacklist.service';
import { TokenBlacklistGuard } from './token-blacklist.guard';

@Global()
@Module({
  providers: [
    TokenBlacklistService,
    TokenBlacklistGuard,
    {
      provide: BLACKLIST_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('redis.url') ?? 'redis://localhost:6379';
        return new Redis(redisUrl);
      },
    },
  ],
  exports: [TokenBlacklistService, TokenBlacklistGuard, BLACKLIST_REDIS_CLIENT],
})
export class TokenBlacklistModule {}
