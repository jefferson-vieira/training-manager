import {
  defaultShouldDehydrateQuery,
  environmentManager,
  MutationCache,
  QueryClient,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';

const UNAUTHORIZED = 401;

let browserQueryClient: QueryClient;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();

  return browserQueryClient;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof AxiosError && error.status === UNAUTHORIZED) {
          window.location.assign('/login');
        }
      },
    }),
  });
}
