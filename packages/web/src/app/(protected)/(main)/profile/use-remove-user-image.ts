'use client';

import { useIsMutating, useQueryClient } from '@tanstack/react-query';

import { updateGetUserQuery } from '@/helpers/cache/update-get-user-query';
import {
  useRemoveUserImage as _useRemoveUserImage,
  getRemoveUserImageMutationOptions,
} from '@/lib/api/query-generated';

export function useIsRemovingUserImage() {
  return (
    useIsMutating({
      mutationKey: getRemoveUserImageMutationOptions().mutationKey,
    }) > 0
  );
}

export function useRemoveUserImage() {
  const queryClient = useQueryClient();

  return _useRemoveUserImage({
    mutation: {
      onSuccess: () => {
        updateGetUserQuery(queryClient, {
          image: null,
        });
      },
    },
  });
}
