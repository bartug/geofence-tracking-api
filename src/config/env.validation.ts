import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  PORT = 3000;

  @IsString()
  DB_HOST: string;

  @Type(() => Number)
  @IsInt()
  DB_PORT: number;

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsInt()
  REDIS_PORT: number;
}

/** ConfigModule.forRoot'un `validate`'i; eksik/hatalı bir env değişkeninde uygulama boot olmadan durur. */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.toString()).join('\n'));
  }

  return validated;
}
