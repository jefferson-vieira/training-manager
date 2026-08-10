'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

import {
  useIsRemovingUserImage,
  useRemoveUserImage,
} from '../use-remove-user-image';

interface Props {
  hasPhoto: boolean;
}

export function RemoveUserImageMenuItem({ hasPhoto }: Props) {
  const isRemovingUserImage = useIsRemovingUserImage();

  const { mutateAsync: removeUserImage } = useRemoveUserImage();

  const handleRemoveUserImageClick = () => {
    toast.promise(removeUserImage, {
      error: 'Não foi possível remover sua foto. Por favor, tente novamente.',
      loading: 'Removendo foto...',
      success: 'Foto de perfil removida.',
    });
  };

  return (
    <DropdownMenuItem
      className="min-h-11"
      disabled={!hasPhoto || isRemovingUserImage}
      variant="destructive"
      onClick={handleRemoveUserImageClick}
    >
      <Trash2 />
      Remover imagem
    </DropdownMenuItem>
  );
}
