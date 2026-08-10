'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type GetUser200, useGetUser } from '@/lib/api/query-generated';

import { AvatarCropDialog } from './avatar-crop-dialog';
import { RemoveUserImageMenuItem } from './remove-user-image-menu-item';
import { UploadUserImageMenuItem } from './upload-user-image-menu-item';

interface AvatarMenuProps {
  user: GetUser200;
}

export function AvatarMenu({ user }: AvatarMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [imageToUpload, setImageToUpload] = useState<null | {
    bitmap: ImageBitmap;
    url: string;
  }>(null);

  const { data } = useGetUser({
    query: {
      initialData: user,
      staleTime: Infinity,
    },
  });

  const openCrop = (imageUrl: string, imageBitmap: ImageBitmap) => {
    setImageToUpload({ bitmap: imageBitmap, url: imageUrl });
    setIsMenuOpen(false);
  };

  const closeCrop = () => {
    if (!imageToUpload) {
      return;
    }

    URL.revokeObjectURL(imageToUpload.url);

    imageToUpload.bitmap.close();

    setImageToUpload(null);
  };

  const { image, name } = data;

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger
          aria-label="Alterar foto de perfil"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar size="xl">
            {image && <AvatarImage alt={name} src={image} />}

            <AvatarFallback>{initials}</AvatarFallback>

            <AvatarBadge>
              <Plus />
            </AvatarBadge>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-48">
          <UploadUserImageMenuItem onSelect={openCrop} />

          <RemoveUserImageMenuItem hasPhoto={Boolean(image)} />
        </DropdownMenuContent>
      </DropdownMenu>

      {imageToUpload && (
        <AvatarCropDialog image={imageToUpload} onClose={closeCrop} />
      )}
    </>
  );
}
