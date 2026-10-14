import type { DayBucket, EventMetricsSummary } from '@agenda/core';
import {
  Icon,
  type IconName,
  Modal,
  Pressable,
  ScrollView,
  Sparkline,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_PADDING = 24;

const CLICK_ROWS: {
  key: 'click_map' | 'click_contact' | 'click_share';
  label: string;
  icon: IconName;
}[] = [
  { key: 'click_map', label: 'Como chegar', icon: 'location-dot' },
  { key: 'click_contact', label: 'WhatsApp/telefone', icon: 'whatsapp' },
  { key: 'click_share', label: 'Compartilhar', icon: 'share-nodes' },
];

function MetricLine({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={14} color="#a6a6a6" />
        <Text className="font-body text-muted-foreground text-sm">{label}</Text>
      </View>
      <Text className="font-body-medium text-foreground text-sm">{value}</Text>
    </View>
  );
}

export function EventMetricsSheet({
  name,
  summary,
  byDay,
  isTablet,
  onClose,
}: {
  name: string | null;
  summary: EventMetricsSummary | null;
  byDay: DayBucket[];
  isTablet: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={summary !== null} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className={`flex-1 justify-end bg-black/60 ${isTablet ? 'items-center' : ''}`}>
          <TouchableWithoutFeedback>
            <View
              className={`border-border bg-card max-h-[85%] w-full rounded-t-3xl border-t px-6 pt-6 ${
                isTablet ? 'max-w-xl' : ''
              }`}
              style={{ paddingBottom: insets.bottom + SHEET_PADDING }}
            >
              <View className="mb-4 flex-row items-center justify-between gap-3">
                <Text
                  numberOfLines={2}
                  className="font-heading text-foreground min-w-0 flex-1 text-lg font-bold"
                >
                  {name ?? 'Detalhes do evento'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  onPress={onClose}
                  className="bg-surface h-11 w-11 items-center justify-center rounded-full"
                >
                  <Icon name="xmark" size={16} color="#a6a6a6" />
                </Pressable>
              </View>

              {summary ? (
                <ScrollView contentContainerClassName="grow gap-6 py-2">
                  <View className="flex-row items-center gap-2">
                    <Icon name="eye" size={16} color="#a6a6a6" />
                    <Text className="font-body-medium text-foreground text-sm">
                      {summary.views} visualizações
                    </Text>
                  </View>

                  <View className="gap-3">
                    {CLICK_ROWS.map(({ key, label, icon }) => (
                      <MetricLine key={key} label={label} icon={icon} value={summary.clicksByKind[key]} />
                    ))}
                    <MetricLine label="Favoritos" icon="heart" value={summary.favorites} />
                  </View>

                  <View>
                    <Text className="font-body-medium text-muted-foreground mb-2 text-xs uppercase">
                      Evolução
                    </Text>
                    <Sparkline data={byDay} width={isTablet ? 320 : 240} height={40} />
                  </View>
                </ScrollView>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
