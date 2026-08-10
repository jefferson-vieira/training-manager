import * as z from 'zod';

import { ACCEPTED_IMAGE_TYPES, MAX_SOURCE_BYTES } from '@/lib/image';
import { formatBytesInMB } from '@/utils/formatters/file';

export const userImageFileSchema = z
  .file()
  .mime(
    [...ACCEPTED_IMAGE_TYPES],
    'Formato não suportado. Envie uma imagem JPG, JPEG, PNG ou WEBP.',
  )
  .max(
    MAX_SOURCE_BYTES,
    `A imagem é muito grande. O tamanho máximo é ${formatBytesInMB(MAX_SOURCE_BYTES)}.`,
  );
