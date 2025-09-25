import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} disabled />
    );

    const button = getByText('Test Button').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Test Button" onPress={() => {}} loading />
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
    expect(queryByText('Test Button')).toBeFalsy();
  });

  it('should apply variant styles', () => {
    const { getByText } = render(
      <Button title="Primary Button" onPress={() => {}} variant="primary" />
    );

    const button = getByText('Primary Button').parent;
    expect(button?.props.style).toContainEqual(
      expect.objectContaining({
        backgroundColor: expect.any(String)
      })
    );
  });

  it('should apply size styles', () => {
    const { getByText } = render(
      <Button title="Large Button" onPress={() => {}} size="large" />
    );

    const button = getByText('Large Button').parent;
    expect(button?.props.style).toContainEqual(
      expect.objectContaining({
        paddingVertical: expect.any(Number)
      })
    );
  });

  it('should render with custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <Button title="Custom Button" onPress={() => {}} style={customStyle} />
    );

    const button = getByText('Custom Button').parent;
    expect(button?.props.style).toContainEqual(customStyle);
  });

  it('should be accessible', () => {
    const { getByText } = render(
      <Button 
        title="Accessible Button" 
        onPress={() => {}} 
        accessibilityLabel="Custom accessibility label"
        accessibilityHint="This button does something"
      />
    );

    const button = getByText('Accessible Button').parent;
    expect(button?.props.accessibilityLabel).toBe('Custom accessibility label');
    expect(button?.props.accessibilityHint).toBe('This button does something');
    expect(button?.props.accessibilityRole).toBe('button');
  });
});