import type { QueryClient } from '@tanstack/react-query';

import type { GetUser200 } from '@/lib/api/fetch-generated';

import { getGetUserQueryKey } from '@/lib/api/query-generated';

export function updateGetUserQuery(
  queryClient: QueryClient,
  nextUser: Partial<GetUser200>,
) {
  const getUserQueryKey = getGetUserQueryKey();

  queryClient.setQueryData<GetUser200>(getUserQueryKey, (user) => {
    if (!user) {
      return user;
    }

    return {
      ...user,
      ...nextUser,
    };
  });

  queryClient.invalidateQueries({ queryKey: getUserQueryKey });
}
