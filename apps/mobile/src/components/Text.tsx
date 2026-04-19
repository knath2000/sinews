import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import React from 'react';
import { colors, typography } from '../lib/tokens';

type TextVariant = 'heading' | 'subheading' | 'body' | 'label' | 'caption';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  weight?: keyof typeof typography.fontWeight;
  size?: keyof typeof typography.fontSize;
}

const Text = ({
  variant = 'body',
  color = colors.text,
  weight = 'normal',
  size,
  style,
  children,
  ...props
}: TextProps) => {
  const variantStyle = getVariantStyle(variant);

  return (
    <RNText
      style={[
        variantStyle,
        {
          color,
          fontFamily: weight,
          fontSize: size ? typography.fontSize[size] : undefined
        },
        style
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const getVariantStyle = (variant: TextVariant) => {
  switch (variant) {
    case 'heading':
      return styles.heading;
    case 'subheading':
      return styles.subheading;
    case 'label':
      return styles.label;
    case 'caption':
      return styles.caption;
    case 'body':
    default:
      return styles.body;
  }
};

const styles = StyleSheet.create({
  heading: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  subheading: {
    fontWeight: '600',
    fontSize: 20,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export { Text };