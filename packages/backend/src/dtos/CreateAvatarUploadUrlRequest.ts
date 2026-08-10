import z from 'zod';

import { env } from '../config/env.js';

export const CreateAvatarUploadUrlRequest = z.object({
  contentLength: z.coerce
    .number()
    .int()
    .min(1)
    .max(env.AVATAR_MAX_BYTES)
    .meta({
      description:
        'Tamanho em bytes da imagem já recortada que será enviada. Serve apenas ' +
        'como triagem inicial: o tamanho real é verificado no objeto enviado ' +
        'durante o commit, então este valor não é tratado como garantia.',
    }),
});
