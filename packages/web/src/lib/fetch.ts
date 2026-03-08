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

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as T;

  return {
    data,
    headers: response.headers,
    status: response.status,
  } as T;
};
