import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from '@tanstack/react-query';
import { ToastProvider } from '@/app/providers/ToastProvider';

const defaultQueryOptions: DefaultOptions = {
  queries: {
    retry: false,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: defaultQueryOptions,
  });

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  const queryClient = createQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
    options,
  );
  return {
    ...result,
    queryClient,
  };
};
