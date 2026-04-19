import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import React from 'react';
import { colors, spacing } from '../lib/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle; // Added for button title customizability
}

const getVariantStyle = (variant: ButtonVariant, disabled: boolean): ViewStyle => {
  switch (variant) {
    case 'primary':
      return { backgroundColor: disabled ? colors.textSecondary : colors.primary };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.textSecondary : colors.border
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    default:
      return { backgroundColor: disabled ? colors.textSecondary : colors.primary };
  }
};

const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  titleStyle
}: ButtonProps) => {
  const getContainerStyle = () => {
    const baseStyles = [styles.base, style, getVariantStyle(variant, disabled)];

    if (disabled) {
      baseStyles.push(styles.disabled);
    }

    return baseStyles;
  };

  const getTitleStyle = () => {
    const baseTitleStyles = [styles.title, titleStyle];
    if (variant === 'ghost') {
      baseTitleStyles.push({ color: disabled ? colors.textSecondary : colors.primary });
    } else {
      baseTitleStyles.push({ color: disabled ? colors.textSecondary : colors.background });
    }
    return baseTitleStyles;
  };

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={getTitleStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Button };