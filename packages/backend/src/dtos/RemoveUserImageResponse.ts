import z from 'zod';

export const RemoveUserImageResponse = z.undefined().meta({
  description: 'Foto de perfil removida',
});
