import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.enableCors({ origin: '*', credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('RAG Backend API')
      .setDescription('AI Knowledge Base Chatbot API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const authService = app.get(AuthService);
    await authService.seedAdmin();

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');

    // CRITICAL FIX: Prevent ECONNRESET during long AI service waits
    // PDF processing + embedding can take 2-5 minutes; default Node timeout is 2 min
    const server = app.getHttpServer();
    server.setTimeout(300000);        // 5 minutes total request timeout
    server.headersTimeout = 305000;   // Must be > setTimeout
    server.keepAliveTimeout = 65000;  // Keep connections alive for reuse

    console.log(`Backend running on http://0.0.0.0:${port}`);
  } catch (err) {
    console.error('BACKEND FAILED TO START:', err);
    process.exit(1);
  }
}
bootstrap();