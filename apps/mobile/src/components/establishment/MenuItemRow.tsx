import type { MenuItem } from '../../data/schemas';
import { Text, View } from '../../tw';
import { formatPrice } from '../../utils/format';

export interface MenuItemRowProps {
  item: MenuItem;
}

/** Linha da tab Cardápio (nome + preço) */
export function MenuItemRow({ item }: MenuItemRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-3.5">
      <Text className="font-body text-[14px] text-foreground">{item.name}</Text>
      <Text className="font-body-semibold text-[14px] text-primary">
        {formatPrice(item.price)}
      </Text>
    </View>
  );
}
