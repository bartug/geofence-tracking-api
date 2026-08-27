import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/exceptions/app-exception.filter';
import { ResponseInterceptor } from './common/envelope/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Geofence Tracking API')
    .setDescription(
      'Konum loglama ve coğrafi sınır (geofence) takip servisi. ' +
        'Tüm yanıtlar { success, message, data, statusCode } zarfı ile döner — ' +
        'aşağıdaki şemalarda gördüğün tipler `data` alanının içeriğidir.',
    )
    .setVersion('1.0')
    .addTag('areas', 'Coğrafi alan (geofence) tanımlama ve listeleme')
    .addTag(
      'locations',
      'Konum bildirimi — geofence kontrolü ve debounce burada işler',
    )
    .addTag('logs', 'Loglanmış alan-giriş kayıtları')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
