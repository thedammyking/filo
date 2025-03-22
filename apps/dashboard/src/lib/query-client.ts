import type { Mutation, Query, QueryKey } from '@tanstack/react-query';
import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient
} from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryCache = new QueryCache({
  onSuccess: (_data: unknown, query: Query<unknown, unknown, unknown, QueryKey>): void => {
    if (query.meta?.SUCCESS_MESSAGE) toast.error(`${query.meta.SUCCESS_MESSAGE}`);
  },
  onError: (error: unknown, query: Query<unknown, unknown, unknown, QueryKey>): void => {
    if (query.meta?.ERROR_MESSAGE) {
      toast.error(`${query.meta.ERROR_MESSAGE}`);
    }

    if (error instanceof Error && query.meta?.ERROR_SOURCE) {
      toast.error(`${query.meta.ERROR_SOURCE}: ${error.message}`);
    }
  }
});

export const mutationCache = new MutationCache({
  onError: (
    error: unknown,
    _variables: unknown,
    _context: unknown,
    mutation: Mutation<unknown, unknown, unknown, unknown>
  ): void => {
    if (mutation.meta?.ERROR_MESSAGE) {
      toast.error(`${mutation.meta.ERROR_MESSAGE}`);
    }

    if (error instanceof Error && mutation.meta?.ERROR_SOURCE) {
      toast.error(`${mutation.meta.ERROR_SOURCE}: ${error.message}`);
    }
  },
  onSuccess: (
    _data: unknown,
    _variables: unknown,
    _context: unknown,
    mutation: Mutation<unknown, unknown, unknown, unknown>
  ): void => {
    if (mutation.meta?.SUCCESS_MESSAGE) toast.success(`${mutation.meta.SUCCESS_MESSAGE}`);
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 15, // 15 minutes,
      gcTime: 1000 * 60 * 60 * 1 // 1 hour
    },
    dehydrate: {
      // include pending queries in dehydration
      shouldDehydrateQuery: query =>
        defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
    }
  },
  queryCache,
  mutationCache
});

export default queryClient;
