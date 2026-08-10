import z from 'zod';

export const UpdateUserImageRequest = z.object({
  key: z
    .string()
    .nonempty()
    .meta({
      description:
        'Chave do objeto retornada por POST /me/image/upload-url. O servidor ' +
        'valida que a chave pertence ao usuário autenticado e inspeciona o ' +
        'objeto no storage antes de vinculá-lo ao perfil.',
    }),
});
