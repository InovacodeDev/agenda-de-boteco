import type { FlashListRef } from '@shopify/flash-list';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ESTABLISHMENTS } from '@/data';
import { cityByIdOrDefault } from '@/data/lookup';
import type { Establishment } from '@/data/schemas';
import { useUserLocation } from '@/hooks/useUserLocation';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';
import { ScrollView, Text, View } from '@/tw';
import { haversineDistanceKm, type LatLng } from '@/utils/geo';

import { EstablishmentCarousel } from './EstablishmentCarousel';

const DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };

/** Altura do carrossel sobreposto (card ~88px + pb-4) — mantém logo/atribuição do mapa visíveis */
const MAP_BOTTOM_CLEARANCE = 104;

function hasAndroidMapsKey(): boolean {
  const config = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  return (typeof config === 'string' && config.length > 0) || __DEV__;
}

/** Fallback quando o Android está sem API key do Google Maps */
function MissingKeyFallback({ establishments }: { establishments: Establishment[] }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
      <View className="border-primary/40 bg-primary/10 rounded-2xl border p-4">
        <Text className="font-body-semibold text-foreground text-[14px]">Mapa indisponível</Text>
        <Text className="font-body text-muted-foreground mt-1 text-[13px]">
          Configure GOOGLE_MAPS_API_KEY_ANDROID no .env e gere um novo dev build para ver o mapa.
          Enquanto isso, os bares da cidade:
        </Text>
      </View>
      {establishments.map((establishment) => (
        <EstablishmentCard key={establishment.id} establishment={establishment} />
      ))}
    </ScrollView>
  );
}

export function MapScreen() {
  const cityId = usePreferencesStore((state) => state.cityId);
  const { coords, request } = useUserLocation();

  const mapRef = useRef<MapView>(null);
  const carouselRef = useRef<FlashListRef<Establishment>>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    request();
  }, [request]);

  const city = cityByIdOrDefault(cityId);
  const centerLat = coords?.lat ?? city.lat;
  const centerLng = coords?.lng ?? city.lng;
  const center: LatLng = { lat: centerLat, lng: centerLng };

  // bares da cidade ordenados por distância de onde o usuário está
  const establishments = useMemo(() => {
    const reference: LatLng = { lat: centerLat, lng: centerLng };
    const inCity = ESTABLISHMENTS.filter((establishment) => establishment.city_id === city.id);
    return [...inCity].sort(
      (a, b) =>
        haversineDistanceKm(reference, { lat: a.lat, lng: a.lng }) -
        haversineDistanceKm(reference, { lat: b.lat, lng: b.lng }),
    );
  }, [city.id, centerLat, centerLng]);

  const focusEstablishment = (index: number) => {
    setSelectedIndex(index);
    const establishment = establishments[index];
    if (establishment) {
      mapRef.current?.animateToRegion(
        {
          latitude: establishment.lat,
          longitude: establishment.lng,
          ...DELTA,
        },
        300,
      );
    }
  };

  const onMarkerPress = (index: number) => {
    focusEstablishment(index);
    carouselRef.current?.scrollToIndex({ index, animated: true });
  };

  if (Platform.OS === 'android' && !hasAndroidMapsKey()) {
    return (
      <Screen noBottomInset>
        <ScreenHeader title="Mapa" showLogo />
        <MissingKeyFallback establishments={establishments} />
      </Screen>
    );
  }

  const provider = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

  const initialRegion: Region = {
    latitude: center.lat,
    longitude: center.lng,
    ...DELTA,
  };

  return (
    <Screen noBottomInset>
      <ScreenHeader title="Mapa" showLogo />
      <View className="flex-1">
        <MapView
          ref={mapRef}
          provider={provider}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          style={StyleSheet.absoluteFill}
          mapPadding={{ top: 0, left: 0, right: 0, bottom: MAP_BOTTOM_CLEARANCE }}
        >
          {establishments.map((establishment, index) => (
            <Marker
              key={establishment.id}
              coordinate={{ latitude: establishment.lat, longitude: establishment.lng }}
              title={establishment.name}
              description={establishment.neighborhood}
              pinColor={index === selectedIndex ? colors.primaryGlow : colors.primary}
              onPress={() => onMarkerPress(index)}
            />
          ))}
        </MapView>

        <View className="absolute inset-x-0 bottom-0 pb-4">
          <EstablishmentCarousel
            ref={carouselRef}
            establishments={establishments}
            onIndexChange={focusEstablishment}
          />
        </View>
      </View>
    </Screen>
  );
}
