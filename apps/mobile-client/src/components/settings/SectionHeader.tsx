import { cn, Icon, type IconName, Text, View } from '@agenda/shared-ui-mobile';
import type { ReactNode } from 'react';

export const PRIMARY = '#1dd75e';
export const ACCENT = '#f9a91f';
export const DESTRUCTIVE = '#f53d7a';
export const FOREGROUND = '#fafafa';
export const FOREGROUND_DIM = 'rgba(250, 250, 250, 0.3)';

interface SectionHeaderProps {
  icon: IconName;
  iconColor: string;
  iconBoxClassName: string;
  title: string;
  description: string;
  aside?: ReactNode;
}

export function SectionHeader({
  icon,
  iconColor,
  iconBoxClassName,
  title,
  description,
  aside,
}: SectionHeaderProps) {
  return (
    <View className="mb-6 flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-3">
        <View
          className={cn('h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBoxClassName)}
        >
          <Icon name={icon} size={24} color={iconColor} weight="bold" />
        </View>
        <View className="flex-1">
          <Text className="font-heading text-foreground text-lg">{title}</Text>
          <Text className="font-body text-muted-foreground text-sm">{description}</Text>
        </View>
      </View>
      {aside}
    </View>
  );
}
