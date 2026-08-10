import { defineConfig } from 'orval';
import 'dotenv/config';

export default defineConfig({
  fetch: {
    input: `${process.env.NEXT_PUBLIC_API_URL}/openapi.json`,
    output: {
      client: 'fetch',
      override: {
        mutator: {
          name: 'customFetch',
          path: './src/lib/fetch.ts',
        },
      },
      target: './src/lib/api/fetch-generated/index.ts',
    },
  },
  query: {
    input: `${process.env.NEXT_PUBLIC_API_URL}/openapi.json`,
    output: {
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          name: 'customInstance',
          path: './src/lib/axios.ts',
        },
      },
      target: './src/lib/api/query-generated/index.ts',
    },
  },
});
