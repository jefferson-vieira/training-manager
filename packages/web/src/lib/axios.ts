import Axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { env } from '@/config/env';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
  }).then(({ data }) => data);

  return promise;
};

export type BodyType<BodyData> = BodyData;

export type ErrorType<Error> = AxiosError<Error>;
