import { useState, useCallback } from 'react';
import { notification } from 'antd';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for consistent async operation handling with loading/error states.
 */
export function useAsync<T>(initialData: T | null = null) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = extractErrorMessage(err);
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  return { ...state, execute, reset };
}

/**
 * Extracts a user-friendly error message from API errors.
 */
function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string; title?: string; message?: string }; status?: number } }).response;
    if (response?.data) {
      // RFC 7807 Problem Detail from our backend
      if (response.data.detail) return response.data.detail;
      if (response.data.title) return response.data.title;
      if (response.data.message) return response.data.message;
    }
    if (response?.status === 429) return 'Too many requests. Please wait and try again.';
    if (response?.status === 401) return 'Unauthorized. Please check your API key.';
    if (response?.status === 502) return 'Backend service unavailable. Please try again later.';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

/**
 * Shows a consistent error notification.
 */
export function showError(title: string, err?: unknown) {
  const description = err ? extractErrorMessage(err) : undefined;
  notification.error({ message: title, description, placement: 'topRight', duration: 5 });
}

/**
 * Shows a consistent success notification.
 */
export function showSuccess(title: string, description?: string) {
  notification.success({ message: title, description, placement: 'topRight', duration: 3 });
}
