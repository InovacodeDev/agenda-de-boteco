import type { EstablishmentAttribute } from '@agenda/core';

import { Icon } from '@/components/ui/Icon';
import { isIconName } from '@/components/ui/iconMap';
import { getAttributeMeta } from '@/data/lookup';
import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';

export interface AttributeChipsProps {
  attributes: readonly EstablishmentAttribute[];
  /** Teto de chips exibidos; o excedente vira um "+N". Sem limite quando ausente. */
  max?: number;
}

/**
 * Chips de diferenciais do bar, usados nos cards de bar e de evento. Sem hover
 * no mobile, a descrição de cada diferencial vai no accessibilityLabel — o
 * equivalente da tooltip do web.
 */
export function AttributeChips({ attributes, max }: AttributeChipsProps) {
  if (attributes.length === 0) return null;

  const visible = max === undefined ? attributes : attributes.slice(0, max);
  const hiddenCount = attributes.length - visible.length;

  return (
    <View className="flex-row flex-wrap items-center gap-1">
      {visible.map((attributeId) => {
        const meta = getAttributeMeta(attributeId);
        return (
          <View
            key={attributeId}
            accessible
            accessibilityLabel={`${meta.label}. ${meta.description}`}
            className="bg-surface-elevated flex-row items-center gap-1 rounded-full px-2 py-0.5"
          >
            {isIconName(meta.icon) ? (
              <Icon name={meta.icon} color={colors.mutedForeground} size={10} />
            ) : null}
            <Text className="font-body text-muted-foreground text-[10px]">{meta.label}</Text>
          </View>
        );
      })}
      {hiddenCount > 0 ? (
        <Text
          accessibilityLabel={`Mais ${hiddenCount} diferenciais`}
          className="font-body text-muted-foreground text-[10px]"
        >
          {`+${hiddenCount}`}
        </Text>
      ) : null}
    </View>
  );
}
