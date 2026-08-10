import z from 'zod';

export const CreateAvatarUploadUrlResponse = z.object({
  expiresIn: z.number().int().meta({
    description: 'Validade da URL assinada, em segundos',
  }),
  key: z.string().meta({
    description:
      'Chave do objeto no bucket; deve ser reenviada em PUT /me/image para ' +
      'concluir a troca da foto',
  }),
  uploadUrl: z.string().meta({
    description:
      'URL assinada para envio direto da imagem ao storage, sem passar pela API',
  }),
});
