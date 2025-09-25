import { Linking, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { type ComponentProps } from 'react';

interface Props {
  href: string;
  children: React.ReactNode;
  style?: any;
}

export function ExternalLink({ href, children, style, ...rest }: Props) {
  const handlePress = async () => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.link, style]} {...rest}>
      {typeof children === 'string' ? (
        <Text style={styles.linkText}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    // Add your link styles here
  },
  linkText: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
});
