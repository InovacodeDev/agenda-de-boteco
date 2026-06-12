import brandLogo from '@assets/logo.png';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Music, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { CITIES } from '@/data';
import { useUserLocation } from '@/hooks/useUserLocation';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';
import { gradientNight } from '@/theme/gradients';
import { shadows } from '@/theme/shadows';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, ScrollView, Text, View } from '@/tw';
import { nearestCity } from '@/utils/geo';

interface FeatureCardProps {
  icon: ReactNode;
  label: string;
}

function FeatureCard({ icon, label }: FeatureCardProps) {
  return (
    <View className="bg-surface/80 flex-1 items-center gap-1.5 rounded-2xl px-2 py-4">
      {icon}
      <Text className="font-body-medium text-foreground text-[12px]">{label}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const setCity = usePreferencesStore((state) => state.setCity);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);
  const { request, status } = useUserLocation();

  const chooseCity = (cityId: string) => {
    setCity(cityId);
    completeOnboarding();
  };

  const useMyLocation = async () => {
    const coords = await request();
    if (coords) {
      chooseCity(nearestCity(coords, CITIES).id);
    }
  };

  return (
    <Screen background={<LinearGradient {...gradientNight} style={StyleSheet.absoluteFill} />}>
      <ScreenHeader>
        <Image
          source={brandLogo}
          className="h-10 w-10 rounded-lg"
          contentFit="cover"
          accessibilityLabel="Agenda de Boteco"
        />
      </ScreenHeader>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 p-6">
        <View className="gap-3">
          <Text
            className="font-heading text-foreground text-[32px]"
            style={{ letterSpacing: headingLetterSpacing(32) }}
          >
            A noite começa <Text className="text-primary">aqui</Text>.
          </Text>
          <Text className="font-body text-muted-foreground text-[15px] leading-6">
            Descubra o que está rolando em bares, pubs e botecos da sua cidade. Música ao vivo,
            happy hour e a melhor agenda da noite.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <FeatureCard icon={<Music color={colors.primary} size={20} />} label="Música ao vivo" />
          <FeatureCard icon={<Sparkles color={colors.primary} size={20} />} label="Promoções" />
          <FeatureCard icon={<MapPin color={colors.primary} size={20} />} label="Perto de você" />
        </View>

        <View className="gap-4 pt-4">
          <Button
            label={status === 'loading' ? 'Localizando…' : 'Usar minha localização'}
            fullWidth
            icon={<MapPin color={colors.primaryForeground} size={16} />}
            onPress={useMyLocation}
            style={{ boxShadow: shadows.neon }}
          />
          {status === 'denied' ? (
            <Text className="font-body text-muted-foreground text-center text-[12px]">
              Permissão negada — escolha sua cidade abaixo.
            </Text>
          ) : null}
          <Text className="font-body text-muted-foreground text-center text-[13px]">
            ou escolha sua cidade
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {CITIES.map((city) => (
              <GuardedPressable
                key={city.id}
                accessibilityRole="button"
                accessibilityLabel={`${city.name}, ${city.uf}`}
                onPress={() => chooseCity(city.id)}
                className="bg-surface/80 w-[47%] grow rounded-2xl px-4 py-3.5 active:opacity-80"
              >
                <Text className="font-body-semibold text-foreground text-[14px]">{city.name}</Text>
                <Text className="font-body text-muted-foreground text-[12px]">{city.uf}</Text>
              </GuardedPressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
