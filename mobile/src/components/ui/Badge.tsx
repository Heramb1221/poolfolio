import React from 'react';
import { View, Text } from 'react-native';
import { InvestmentStatus, GroupRole } from '../../types/api';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default' }) => {
  let bgClass = 'bg-slate-800 border-slate-700';
  let textClass = 'text-slate-300';

  if (variant === 'success') {
    bgClass = 'bg-emerald-950/80 border-emerald-800';
    textClass = 'text-emerald-400';
  } else if (variant === 'warning') {
    bgClass = 'bg-amber-950/80 border-amber-800';
    textClass = 'text-amber-400';
  } else if (variant === 'danger') {
    bgClass = 'bg-rose-950/80 border-rose-800';
    textClass = 'text-rose-400';
  } else if (variant === 'info') {
    bgClass = 'bg-sky-950/80 border-sky-800';
    textClass = 'text-sky-400';
  }

  return (
    <View className={`px-2.5 py-1 rounded-full border self-start ${bgClass}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wider ${textClass}`}>
        {label}
      </Text>
    </View>
  );
};

export const StatusBadge: React.FC<{ status: InvestmentStatus }> = ({ status }) => {
  switch (status) {
    case 'OPEN':
      return <Badge label="OPEN" variant="info" />;
    case 'LOCKED':
      return <Badge label="LOCKED" variant="warning" />;
    case 'ACTIVE':
      return <Badge label="ACTIVE" variant="success" />;
    case 'SETTLED':
      return <Badge label="SETTLED" variant="default" />;
    case 'CANCELLED':
      return <Badge label="CANCELLED" variant="danger" />;
    case 'DRAFT':
    default:
      return <Badge label="DRAFT" variant="default" />;
  }
};

export const RoleBadge: React.FC<{ role: GroupRole }> = ({ role }) => {
  switch (role) {
    case 'LEADER':
      return <Badge label="LEADER" variant="warning" />;
    case 'CO_LEADER':
      return <Badge label="CO-LEADER" variant="info" />;
    case 'MEMBER':
    default:
      return <Badge label="MEMBER" variant="default" />;
  }
};
