import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  let bgClass = 'bg-primary';
  let textClass = 'text-slate-950 font-semibold';

  if (variant === 'secondary') {
    bgClass = 'bg-surface border border-border';
    textClass = 'text-white font-medium';
  } else if (variant === 'danger') {
    bgClass = 'bg-danger';
    textClass = 'text-white font-semibold';
  } else if (variant === 'outline') {
    bgClass = 'bg-transparent border border-primary';
    textClass = 'text-primary font-semibold';
  }

  if (disabled || isLoading) {
    bgClass += ' opacity-50';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      className={`py-3.5 px-4 rounded-xl items-center justify-center flex-row ${bgClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#090d16' : '#ffffff'} />
      ) : (
        <Text className={`text-base ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
