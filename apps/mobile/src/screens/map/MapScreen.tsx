import type { FlashListRef } from '@shopify/flash-list';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import type { Establishment } from '@/data/schemas';
import { useEstablishmentsQuery } from '@/hooks/queries';
import { useActiveCity } from '@/hooks/useActiveCity';
import { useUserLocation } from '@/hooks/useUserLocation';
import { colors } from '@/theme/colors';
import { ScrollView, Text, View } from '@/tw';
import { haversineDistanceKm, type LatLng, resolveMapOrigin } from '@/utils/geo';

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
  const { coords, status, request } = useUserLocation();

  const mapRef = useRef<MapView>(null);
  const carouselRef = useRef<FlashListRef<Establishment>>(null);
  const hasCenteredRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    request();
  }, [request]);

  const city = useActiveCity();
  const origin = resolveMapOrigin(coords, status, city);

  // `initialRegion` só é lido no primeiro render; cidade e GPS resolvem depois,
  // então centraliza uma vez via ref — sem brigar com o pan seguinte do usuário.
  useEffect(() => {
    if (!origin || hasCenteredRef.current) {
      return;
    }
    hasCenteredRef.current = true;
    mapRef.current?.animateToRegion({ latitude: origin.lat, longitude: origin.lng, ...DELTA }, 300);
  }, [origin]);

  const { data: cityEstablishments } = useEstablishmentsQuery(city?.id);

  const originLat = origin?.lat;
  const originLng = origin?.lng;

  // bares da cidade ordenados por distância da origem do mapa
  const establishments = useMemo(() => {
    const list = [...(cityEstablishments ?? [])];
    if (originLat === undefined || originLng === undefined) {
      return list;
    }
    const reference: LatLng = { lat: originLat, lng: originLng };
    return list.sort(
      (a, b) =>
        haversineDistanceKm(reference, { lat: a.lat, lng: a.lng }) -
        haversineDistanceKm(reference, { lat: b.lat, lng: b.lng }),
    );
  }, [cityEstablishments, originLat, originLng]);

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
      <Screen noBottomInset header={<ScreenHeader title="Mapa" showLogo />}>
        <MissingKeyFallback establishments={establishments} />
      </Screen>
    );
  }

  const provider = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

  const initialRegion: Region | undefined = origin
    ? { latitude: origin.lat, longitude: origin.lng, ...DELTA }
    : undefined;

  return (
    <Screen header={<ScreenHeader title="Mapa" showLogo />}>
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
