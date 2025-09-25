import { renderHook, act } from '@testing-library/react-native';
import { useForm } from '../useForm';

describe('useForm Hook', () => {
  it('should initialize with initial values', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should update values when setValue is called', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setValue('email', 'test@example.com');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.values.password).toBe('');
  });

  it('should set errors when setError is called', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setError('email', 'Email is required');
    });

    expect(result.current.errors.email).toBe('Email is required');
  });

  it('should clear errors when clearError is called', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setError('email', 'Email is required');
    });

    expect(result.current.errors.email).toBe('Email is required');

    act(() => {
      result.current.clearError('email');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('should validate form with validation rules', () => {
    const initialValues = { email: '', password: '' };
    const validationRules = {
      email: (value: string) => {
        if (!value) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
        return null;
      },
      password: (value: string) => {
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return null;
      }
    };

    const { result } = renderHook(() => useForm(initialValues, validationRules));

    // Test empty form validation
    act(() => {
      const isValid = result.current.validate();
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.errors.password).toBe('Password is required');

    // Test invalid email
    act(() => {
      result.current.setValue('email', 'invalid-email');
      result.current.setValue('password', '123');
      const isValid = result.current.validate();
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.email).toBe('Email is invalid');
    expect(result.current.errors.password).toBe('Password must be at least 6 characters');

    // Test valid form
    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'password123');
      const isValid = result.current.validate();
      expect(isValid).toBe(true);
    });

    expect(result.current.errors).toEqual({});
  });

  it('should handle form submission', async () => {
    const initialValues = { email: '', password: '' };
    const mockSubmit = jest.fn().mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'password123');
    });

    await act(async () => {
      await result.current.handleSubmit(mockSubmit);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should handle submission errors', async () => {
    const initialValues = { email: '', password: '' };
    const mockSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
    
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'password123');
    });

    await act(async () => {
      try {
        await result.current.handleSubmit(mockSubmit);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('should reset form to initial values', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'password123');
      result.current.setError('email', 'Some error');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.errors.email).toBe('Some error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });

  it('should track isSubmitting state during submission', async () => {
    const initialValues = { email: '', password: '' };
    let resolveSubmit: () => void;
    const mockSubmit = jest.fn(() => new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    }));
    
    const { result } = renderHook(() => useForm(initialValues));

    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      result.current.handleSubmit(mockSubmit);
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveSubmit();
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});