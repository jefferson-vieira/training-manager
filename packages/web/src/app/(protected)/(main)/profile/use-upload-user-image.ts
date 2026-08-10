'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { updateGetUserQuery } from '@/helpers/cache/update-get-user-query';
import {
  useCreateAvatarUploadUrl,
  useUpdateUserImage,
} from '@/lib/api/query-generated';
import { type CropArea, cropToBlob } from '@/lib/image';
import { uploadWithProgress } from '@/lib/upload';

const OUTPUT_CONTENT_TYPE = 'image/webp';

export const MIN_ZOOM = 1;

export const MAX_ZOOM = 3;

export const ZOOM_STEP = 0.01;

interface UseUploadUSerImageOptions {
  bitmap: ImageBitmap;
  onUploaded: () => void;
}

export function useUploadUserImage({
  bitmap,
  onUploaded,
}: UseUploadUSerImageOptions) {
  const queryClient = useQueryClient();

  const [crop, setCrop] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(MIN_ZOOM);

  const [progress, setProgress] = useState(0);

  const croppedAreaRef = useRef<CropArea | null>(null);

  const { mutateAsync: createUploadUrl } = useCreateAvatarUploadUrl();

  const { mutateAsync: uploadUserImage } = useUpdateUserImage({
    mutation: {
      onSuccess: ({ image }) => {
        updateGetUserQuery(queryClient, { image });
      },
    },
  });

  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      const area = croppedAreaRef.current;

      if (!area) {
        return;
      }

      setProgress(0);

      const blob = await cropToBlob(bitmap, area, OUTPUT_CONTENT_TYPE);

      const { key, uploadUrl } = await createUploadUrl({
        data: {
          contentLength: blob.size,
        },
      });

      await uploadWithProgress({
        blob,
        contentType: OUTPUT_CONTENT_TYPE,
        onProgress: setProgress,
        url: uploadUrl,
      });

      await uploadUserImage({
        data: {
          key,
        },
      });
    },
    onError: () => {
      toast.error(
        'Erro ao atualizar foto de perfil. Por favor, tente novamente.',
      );
    },
    onSettled: () => {
      setProgress(0);
    },
    onSuccess: () => {
      toast.success('Foto de perfil atualizada.');

      onUploaded();
    },
  });

  const setCroppedArea = useCallback((area: CropArea) => {
    croppedAreaRef.current = area;
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setZoom((current) =>
      Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))),
      ),
    );
  }, []);

  return {
    crop,
    isUploading: isPending,
    progress,
    setCrop,
    setCroppedArea,
    setZoom,
    upload: mutate,
    zoom,
    zoomBy,
  };
}
