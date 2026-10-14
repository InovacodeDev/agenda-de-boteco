import type { EventMetricsSummary } from '@agenda/core';
import { Card, Icon, type IconName, Pressable, Text, View } from '@agenda/shared-ui-mobile';

function totalClicks(summary: EventMetricsSummary): number {
  return (
    summary.clicksByKind.click_map +
    summary.clicksByKind.click_contact +
    summary.clicksByKind.click_share
  );
}

function Column({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  return (
    <View className="items-center">
      <Text className="font-body text-muted-foreground text-[10px] uppercase">{label}</Text>
      <View className="mt-0.5 flex-row items-center gap-1.5">
        <Icon name={icon} size={14} color="#a6a6a6" />
        <Text className="font-heading text-foreground text-sm font-semibold">{value}</Text>
      </View>
    </View>
  );
}

export function EventMetricsRow({
  name,
  summary,
  onViewDetails,
}: {
  name: string;
  summary: EventMetricsSummary;
  onViewDetails: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes de métricas de ${name}`}
      onPress={onViewDetails}
    >
      <Card className="p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text numberOfLines={2} className="font-heading text-foreground min-w-0 flex-1 text-sm font-bold">
            {name}
          </Text>
          <Icon name="chevron-right" size={16} color="#737373" />
        </View>
        <View className="border-border/60 mt-3 flex-row items-center justify-between border-t pt-3">
          <Column label="Views" icon="eye" value={summary.views} />
          <Column label="Cliques" icon="location-dot" value={totalClicks(summary)} />
          <Column label="Favoritos" icon="heart" value={summary.favorites} />
        </View>
      </Card>
    </Pressable>
  );
}
