import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Test component to access the context
const TestComponent = () => {
  const { user, isLoading, login, logout } = useAuth();
  
  return (
    <>
      {isLoading && <div testID="loading">Loading</div>}
      {user && <div testID="user">{user.email}</div>}
      <button testID="login-btn" onPress={() => login('test@example.com', 'password')} />
      <button testID="logout-btn" onPress={() => logout()} />
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should provide initial state', () => {
    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(queryByTestId('loading')).toBeTruthy();
    expect(queryByTestId('user')).toBeFalsy();
  });

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      provider: 'Local',
      isGuest: false
    };

    const mockAuthResponse = {
      success: true,
      token: 'mock-token',
      user: mockUser
    };

    mockedApi.login.mockResolvedValue(mockAuthResponse);

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      getByTestId('login-btn').props.onPress();
    });

    await waitFor(() => {
      expect(queryByTestId('loading')).toBeFalsy();
      expect(getByTestId('user')).toBeTruthy();
      expect(getByTestId('user').children[0]).toBe('test@example.com');
    });

    expect(mockedApi.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
  });

  it('should handle login failure', async () => {
    mockedApi.login.mockRejectedValue(new Error('Invalid credentials'));

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      getByTestId('login-btn').props.onPress();
    });

    await waitFor(() => {
      expect(queryByTestId('loading')).toBeFalsy();
      expect(queryByTestId('user')).toBeFalsy();
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should logout successfully', async () => {
    // First login
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      provider: 'Local',
      isGuest: false
    };

    const mockAuthResponse = {
      success: true,
      token: 'mock-token',
      user: mockUser
    };

    mockedApi.login.mockResolvedValue(mockAuthResponse);

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login
    await act(async () => {
      getByTestId('login-btn').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('user')).toBeTruthy();
    });

    // Logout
    await act(async () => {
      getByTestId('logout-btn').props.onPress();
    });

    await waitFor(() => {
      expect(queryByTestId('user')).toBeFalsy();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
  });

  it('should restore user from storage on initialization', async () => {
    const mockUser = {
      id: '1',
      email: 'stored@example.com',
      firstName: 'Stored',
      lastName: 'User',
      provider: 'Local',
      isGuest: false
    };

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return Promise.resolve('stored-token');
      if (key === 'user') return Promise.resolve(JSON.stringify(mockUser));
      return Promise.resolve(null);
    });

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(queryByTestId('loading')).toBeFalsy();
      expect(getByTestId('user')).toBeTruthy();
      expect(getByTestId('user').children[0]).toBe('stored@example.com');
    });
  });

  it('should handle corrupted storage data', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return Promise.resolve('stored-token');
      if (key === 'user') return Promise.resolve('invalid-json');
      return Promise.resolve(null);
    });

    const { queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(queryByTestId('loading')).toBeFalsy();
      expect(queryByTestId('user')).toBeFalsy();
    });
  });
});