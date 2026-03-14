import { NestFactory } from '@nestjs/core';
import {
  CallHandler,
  ExecutionContext,
  LoggerService,
  NestInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

class JsonLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('trace', message, optionalParams);
  }

  private write(level: string, message: unknown, optionalParams: unknown[]) {
    let context: string | undefined;
    let trace: string | undefined;
    const params = [...optionalParams];

    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      context = params.pop() as string;
    }

    if (
      level === 'error' &&
      params.length > 0 &&
      typeof params[0] === 'string'
    ) {
      trace = params.shift() as string;
    }

    const record: Record<string, JsonValue> = {
      ts: new Date().toISOString(),
      level,
      pid: process.pid,
    };

    if (typeof message === 'string') record.msg = message;
    else if (message != null) record.data = message as JsonValue;

    if (context) record.context = context;
    if (trace) record.trace = trace;
    if (params.length > 0) record.extra = params as JsonValue;

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(record)}\n`);
  }
}

class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request | undefined>();
    const res = http.getResponse<Response | undefined>();

    const method = req?.method ?? 'UNKNOWN';
    const url = req?.originalUrl ?? req?.url ?? '';
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        this.logger.log(
          {
            type: 'http',
            method,
            url,
            statusCode: res?.statusCode ?? null,
            durationMs: Math.round(durationMs * 100) / 100,
          },
          'HTTP',
        );
      }),
    );
  }
}

async function bootstrap() {
  const logger = new JsonLogger();
  const app = await NestFactory.create(AppModule, { logger });
  app.useGlobalInterceptors(new RequestLoggingInterceptor(logger));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('YetAnotherCRM API')
    .setVersion('1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port);
}
void bootstrap();
