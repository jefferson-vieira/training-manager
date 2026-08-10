import z from 'zod';

export const UpdateUserImageResponse = z.object({
  image: z.string().meta({
    description: 'URL pública da nova foto de perfil do usuário',
  }),
});
