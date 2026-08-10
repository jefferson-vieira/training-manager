import { cookies } from 'next/headers';

import { env } from '@/config/env';

export const customFetch = async <T>(url: string, options: RequestInit) => {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      cookie: (await cookies()).toString(),
    },
  });

  const data =
    response.status === 204 ? undefined : ((await response.json()) as T);

  return {
    data,
    headers: response.headers,
    status: response.status,
  } as T;
};
