import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-slate-300 text-sm font-medium mb-1.5">{label}</Text>
      )}
      <TextInput
        placeholderTextColor="#64748b"
        className={`bg-surface border ${
          error ? 'border-danger' : 'border-border'
        } rounded-xl px-4 py-3 text-white text-base focus:border-primary ${className}`}
        {...props}
      />
      {error && <Text className="text-danger text-xs mt-1">{error}</Text>}
    </View>
  );
};
