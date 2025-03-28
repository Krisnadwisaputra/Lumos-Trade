import { QueryClient } from '@tanstack/react-query';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Custom fetch function for React Query
export const apiRequest = async <T>(method: Method, url: string, data?: any): Promise<T> => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// Default fetcher for react-query
const defaultQueryFn = async ({ queryKey }: any) => {
  // The first item in the queryKey array is the path
  const path = queryKey[0];
  return apiRequest('GET', path);
};

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;