import type { App } from '../lib/fastify.js';

import { CreateAvatarUploadUrlRequest } from '../dtos/CreateAvatarUploadUrlRequest.js';
import { CreateAvatarUploadUrlResponse } from '../dtos/CreateAvatarUploadUrlResponse.js';
import { RemoveUserImageResponse } from '../dtos/RemoveUserImageResponse.js';
import { UpdateUserImageRequest } from '../dtos/UpdateUserImageRequest.js';
import { UpdateUserImageResponse } from '../dtos/UpdateUserImageResponse.js';
import { InvalidFormatError } from '../errors/InvalidFormatError.js';
import { UploadTooLargeError } from '../errors/UploadTooLargeError.js';
import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { UserSchema } from '../schemas/UserSchema.js';
import { CreateAvatarUploadUrl } from '../use-cases/user/CreateAvatarUploadUrl.js';
import { GetUserWithProfile } from '../use-cases/user/GetUserWithProfile.js';
import { RemoveUserImage } from '../use-cases/user/RemoveUserImage.js';
import { UpdateUserImage } from '../use-cases/user/UpdateUserImage.js';

export const meRoutes = async (app: App) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getSession(request);

      const getUserWithProfile = new GetUserWithProfile();

      const result = await getUserWithProfile.execute({
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getUser',
      response: {
        200: UserSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get user',
      tags: ['Me'],
    },
  });

  app.post('/image/upload-url', {
    handler: async (request, reply) => {
      const session = await getSession(request);

      const createAvatarUploadUrl = new CreateAvatarUploadUrl();

      const result = await createAvatarUploadUrl.execute({
        contentLength: request.body.contentLength,
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      body: CreateAvatarUploadUrlRequest,
      operationId: 'createAvatarUploadUrl',
      response: {
        200: CreateAvatarUploadUrlResponse,
        400: ErrorSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Create a presigned URL for uploading a profile photo',
      tags: ['Me'],
    },
  });

  app.put('/image', {
    handler: async (request, reply) => {
      const session = await getSession(request);

      const updateUserImage = new UpdateUserImage();

      try {
        const result = await updateUserImage.execute({
          key: request.body.key,
          userId: session.user.id,
        });

        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof InvalidFormatError) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            error: error.message,
          });
        }

        if (error instanceof UploadTooLargeError) {
          return reply.status(413).send({
            code: 'PAYLOAD_TOO_LARGE',
            error: error.message,
          });
        }

        throw error;
      }
    },
    schema: {
      body: UpdateUserImageRequest,
      operationId: 'updateUserImage',
      response: {
        200: UpdateUserImageResponse,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        413: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Commit an uploaded profile photo',
      tags: ['Me'],
    },
  });

  app.delete('/image', {
    handler: async (request, reply) => {
      const session = await getSession(request);

      const removeUserImage = new RemoveUserImage();

      await removeUserImage.execute({
        userId: session.user.id,
      });

      return reply.status(204).send();
    },
    schema: {
      operationId: 'removeUserImage',
      response: {
        204: RemoveUserImageResponse,
        401: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Remove the profile photo',
      tags: ['Me'],
    },
  });
};
