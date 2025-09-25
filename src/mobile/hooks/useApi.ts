import { useState, useCallback } from 'react';
import { Status, ApiError } from '../types';

interface UseApiState<T> {
  data: T | null;
  status: Status;
  error: ApiError | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (apiCall: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useApi = <T = any>(initialData: T | null = null): UseApiReturn<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    status: 'idle',
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      setState(prev => ({ ...prev, status: 'loading', error: null }));
      
      const result = await apiCall();
      
      setState({
        data: result,
        status: 'success',
        error: null,
      });
      
      return result;
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Bir hata oluştu',
        status: error.response?.status,
        code: error.code,
      };
      
      setState({
        data: null,
        status: 'error',
        error: apiError,
      });
      
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      status: 'idle',
      error: null,
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
};

export default useApi;