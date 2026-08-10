'use client';

import { ImageUp } from 'lucide-react';
import { type ChangeEvent, useRef } from 'react';
import { toast } from 'sonner';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ACCEPTED_IMAGE_TYPES, decodeImage } from '@/lib/image';

import { useIsRemovingUserImage } from '../../use-remove-user-image';
import { userImageFileSchema } from './schema';

interface Props {
  onSelect: (url: string, bitmap: ImageBitmap) => void;
}

export function UploadUserImageMenuItem({ onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isRemovingPhoto = useIsRemovingUserImage();

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    const result = userImageFileSchema.safeParse(file);

    if (!result.success) {
      toast.error(result.error.issues[0].message);

      return;
    }

    const bitmap = await decodeImage(file);

    if (!bitmap) {
      toast.error(
        'Não foi possível abir esta imagem. Ela pode estar corrompida.',
      );

      return;
    }

    onSelect(URL.createObjectURL(file), bitmap);
  };

  return (
    <>
      <DropdownMenuItem
        className="min-h-11"
        closeOnClick={false}
        disabled={isRemovingPhoto}
        onClick={() => inputRef.current?.click()}
      >
        <ImageUp />
        Enviar imagem
      </DropdownMenuItem>

      <input
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        capture="user"
        className="hidden"
        ref={inputRef}
        type="file"
        onChange={handleChange}
      />
    </>
  );
}
