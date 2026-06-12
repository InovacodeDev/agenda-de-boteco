import type { MenuItem } from '@/data/schemas';
import { Text, View } from '@/tw';
import { formatPrice } from '@/utils/format';

export interface MenuItemRowProps {
  item: MenuItem;
}

/** Linha da tab Cardápio (nome + preço) */
export function MenuItemRow({ item }: MenuItemRowProps) {
  return (
    <View className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5">
      <Text className="font-body text-foreground text-[14px]">{item.name}</Text>
      <Text className="font-body-semibold text-primary text-[14px]">{formatPrice(item.price)}</Text>
    </View>
  );
}
