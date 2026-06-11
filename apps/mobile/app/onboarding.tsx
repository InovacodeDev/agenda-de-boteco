import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Music, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import brandLogo from '../assets/logo.png';
import { Button } from '../src/components/ui/Button';
import { CITIES } from '../src/data';
import { useUserLocation } from '../src/hooks/useUserLocation';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { colors } from '../src/theme/colors';
import { gradientNight } from '../src/theme/gradients';
import { shadows } from '../src/theme/shadows';
import { headingLetterSpacing } from '../src/theme/typography';
import { Image, Pressable, ScrollView, Text, View } from '../src/tw';
import { nearestCity } from '../src/utils/geo';

interface FeatureCardProps {
  icon: ReactNode;
  label: string;
}

function FeatureCard({ icon, label }: FeatureCardProps) {
  return (
    <View className="flex-1 items-center gap-1.5 rounded-2xl bg-surface/80 px-2 py-4">
      {icon}
      <Text className="font-body-medium text-[12px] text-foreground">{label}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-background">
      <LinearGradient {...gradientNight} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 p-6"
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Image
          source={brandLogo}
          className="h-20 w-20 rounded-xl"
          contentFit="cover"
          accessibilityLabel="Agenda de Boteco"
        />

        <View className="gap-3">
          <Text
            className="font-heading text-[32px] text-foreground"
            style={{ letterSpacing: headingLetterSpacing(32) }}
          >
            A noite começa <Text className="text-primary">aqui</Text>.
          </Text>
          <Text className="font-body text-[15px] leading-6 text-muted-foreground">
            Descubra o que está rolando em bares, pubs e botecos da sua cidade. Música ao
            vivo, happy hour e a melhor agenda da noite.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <FeatureCard
            icon={<Music color={colors.primary} size={20} />}
            label="Música ao vivo"
          />
          <FeatureCard
            icon={<Sparkles color={colors.primary} size={20} />}
            label="Promoções"
          />
          <FeatureCard
            icon={<MapPin color={colors.primary} size={20} />}
            label="Perto de você"
          />
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
            <Text className="text-center font-body text-[12px] text-muted-foreground">
              Permissão negada — escolha sua cidade abaixo.
            </Text>
          ) : null}
          <Text className="text-center font-body text-[13px] text-muted-foreground">
            ou escolha sua cidade
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {CITIES.map((city) => (
              <Pressable
                key={city.id}
                accessibilityRole="button"
                accessibilityLabel={`${city.name}, ${city.uf}`}
                onPress={() => chooseCity(city.id)}
                className="w-[47%] grow rounded-2xl bg-surface/80 px-4 py-3.5 active:opacity-80"
              >
                <Text className="font-body-semibold text-[14px] text-foreground">
                  {city.name}
                </Text>
                <Text className="font-body text-[12px] text-muted-foreground">{city.uf}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
