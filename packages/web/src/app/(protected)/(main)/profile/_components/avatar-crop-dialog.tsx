'use client';

import { Minus, Plus } from 'lucide-react';
import Cropper from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';

import {
  MAX_ZOOM,
  MIN_ZOOM,
  useUploadUserImage,
  ZOOM_STEP,
} from '../use-upload-user-image';

export interface AvatarCropDialogProps {
  image: { bitmap: ImageBitmap; url: string };
  onClose: () => void;
}

export function AvatarCropDialog({ image, onClose }: AvatarCropDialogProps) {
  const {
    crop,
    isUploading,
    progress,
    setCrop,
    setCroppedArea,
    setZoom,
    upload,
    zoom,
    zoomBy,
  } = useUploadUserImage({
    bitmap: image.bitmap,
    onUploaded: onClose,
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open || isUploading) {
          return;
        }

        onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>

          <DialogDescription>
            Arraste para reposicionar e use o zoom para enquadrar sua foto.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
          <Cropper
            aspect={1}
            crop={crop}
            cropShape="round"
            image={image.url}
            maxZoom={MAX_ZOOM}
            minZoom={MIN_ZOOM}
            showGrid={false}
            zoom={zoom}
            onCropChange={setCrop}
            onCropComplete={(_, croppedAreaPixels) => {
              setCroppedArea(croppedAreaPixels);
            }}
            onZoomChange={setZoom}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            aria-label="Diminuir zoom"
            disabled={isUploading || zoom <= MIN_ZOOM}
            size="icon-xl"
            type="button"
            variant="outline"
            onClick={() => zoomBy(-ZOOM_STEP)}
          >
            <Minus />
          </Button>

          <Slider
            aria-label="Zoom"
            disabled={isUploading}
            max={MAX_ZOOM}
            min={MIN_ZOOM}
            step={ZOOM_STEP}
            value={[zoom]}
            onValueChange={(value) => {
              setZoom(value as number);
            }}
          />

          <Button
            aria-label="Aumentar zoom"
            disabled={isUploading || zoom >= MAX_ZOOM}
            size="icon-xl"
            type="button"
            variant="outline"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <Plus />
          </Button>
        </div>

        {isUploading && (
          <Progress className="w-full" value={progress}>
            <ProgressLabel>Enviando sua foto...</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}

        <DialogFooter>
          <DialogClose
            disabled={isUploading}
            render={
              <Button size="xl" type="button" variant="outline">
                Cancelar
              </Button>
            }
            onClick={onClose}
          />

          <Button
            loading={isUploading}
            size="xl"
            type="button"
            onClick={() => upload()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
