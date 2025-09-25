import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input Component', () => {
  it('should render with placeholder', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" onChangeText={() => {}} />
    );

    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('should call onChangeText when text changes', () => {
    const mockOnChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" onChangeText={mockOnChangeText} />
    );

    const input = getByPlaceholderText('Enter text');
    fireEvent.changeText(input, 'test input');

    expect(mockOnChangeText).toHaveBeenCalledWith('test input');
  });

  it('should display value', () => {
    const { getByDisplayValue } = render(
      <Input value="test value" onChangeText={() => {}} />
    );

    expect(getByDisplayValue('test value')).toBeTruthy();
  });

  it('should show label when provided', () => {
    const { getByText } = render(
      <Input label="Email" placeholder="Enter email" onChangeText={() => {}} />
    );

    expect(getByText('Email')).toBeTruthy();
  });

  it('should show error message when error is provided', () => {
    const { getByText } = render(
      <Input 
        placeholder="Enter text" 
        onChangeText={() => {}} 
        error="This field is required"
      />
    );

    expect(getByText('This field is required')).toBeTruthy();
  });

  it('should apply error styles when error is present', () => {
    const { getByPlaceholderText } = render(
      <Input 
        placeholder="Enter text" 
        onChangeText={() => {}} 
        error="This field is required"
      />
    );

    const input = getByPlaceholderText('Enter text');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: expect.any(String)
      })
    );
  });

  it('should be secure when secureTextEntry is true', () => {
    const { getByPlaceholderText } = render(
      <Input 
        placeholder="Enter password" 
        onChangeText={() => {}} 
        secureTextEntry
      />
    );

    const input = getByPlaceholderText('Enter password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input 
        placeholder="Enter text" 
        onChangeText={mockOnChangeText} 
        disabled
      />
    );

    const input = getByPlaceholderText('Enter text');
    expect(input.props.editable).toBe(false);

    fireEvent.changeText(input, 'test');
    expect(mockOnChangeText).not.toHaveBeenCalled();
  });

  it('should apply multiline styles when multiline is true', () => {
    const { getByPlaceholderText } = render(
      <Input 
        placeholder="Enter description" 
        onChangeText={() => {}} 
        multiline
        numberOfLines={4}
      />
    );

    const input = getByPlaceholderText('Enter description');
    expect(input.props.multiline).toBe(true);
    expect(input.props.numberOfLines).toBe(4);
  });

  it('should handle focus and blur events', () => {
    const mockOnFocus = jest.fn();
    const mockOnBlur = jest.fn();
    
    const { getByPlaceholderText } = render(
      <Input 
        placeholder="Enter text" 
        onChangeText={() => {}} 
        onFocus={mockOnFocus}
        onBlur={mockOnBlur}
      />
    );

    const input = getByPlaceholderText('Enter text');
    
    fireEvent(input, 'focus');
    expect(mockOnFocus).toHaveBeenCalled();

    fireEvent(input, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('should be accessible', () => {
    const { getByPlaceholderText } = render(
      <Input 
        placeholder="Enter text" 
        onChangeText={() => {}} 
        accessibilityLabel="Text input field"
        accessibilityHint="Enter your text here"
      />
    );

    const input = getByPlaceholderText('Enter text');
    expect(input.props.accessibilityLabel).toBe('Text input field');
    expect(input.props.accessibilityHint).toBe('Enter your text here');
  });
});