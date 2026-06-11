import type { FlashListRef } from '@shopify/flash-list';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstablishmentCard } from '../../components/establishment/EstablishmentCard';
import { CITIES, ESTABLISHMENTS } from '../../data';
import type { Establishment } from '../../data/schemas';
import { useUserLocation } from '../../hooks/useUserLocation';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { colors } from '../../theme/colors';
import { ScrollView, Text, View } from '../../tw';
import { haversineDistanceKm, type LatLng } from '../../utils/geo';
import { EstablishmentCarousel } from './EstablishmentCarousel';
import { darkMapStyle } from './mapStyle';

const DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };

function hasAndroidMapsKey(): boolean {
  const config = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  return typeof config === 'string' && config.length > 0;
}

function hasIosMapsKey(): boolean {
  const config = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
  return typeof config === 'string' && config.length > 0;
}

/** Fallback quando o Android está sem API key do Google Maps */
function MissingKeyFallback({ establishments }: { establishments: Establishment[] }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="gap-3 p-4"
    >
      <View className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
        <Text className="font-body-semibold text-[14px] text-foreground">
          Mapa indisponível
        </Text>
        <Text className="mt-1 font-body text-[13px] text-muted-foreground">
          Configure GOOGLE_MAPS_API_KEY_ANDROID no .env e gere um novo dev build para
          ver o mapa. Enquanto isso, os bares da cidade:
        </Text>
      </View>
      {establishments.map((establishment) => (
        <EstablishmentCard key={establishment.id} establishment={establishment} />
      ))}
    </ScrollView>
  );
}

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const cityId = usePreferencesStore((state) => state.cityId);
  const { coords, request } = useUserLocation();

  const mapRef = useRef<MapView>(null);
  const carouselRef = useRef<FlashListRef<Establishment>>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    request();
  }, [request]);

  const city = CITIES.find((item) => item.id === cityId) ?? CITIES[0];
  const centerLat = coords?.lat ?? city.lat;
  const centerLng = coords?.lng ?? city.lng;
  const center: LatLng = { lat: centerLat, lng: centerLng };

  // bares da cidade ordenados por distância de onde o usuário está
  const establishments = useMemo(() => {
    const reference: LatLng = { lat: centerLat, lng: centerLng };
    const inCity = ESTABLISHMENTS.filter(
      (establishment) => establishment.city_id === city.id,
    );
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
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <MissingKeyFallback establishments={establishments} />
      </View>
    );
  }

  const provider =
    Platform.OS === 'ios' && !hasIosMapsKey() ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

  const initialRegion: Region = {
    latitude: center.lat,
    longitude: center.lng,
    ...DELTA,
  };

  return (
    <View className="flex-1 bg-background">
      <MapView
        ref={mapRef}
        provider={provider}
        customMapStyle={darkMapStyle}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        style={{ flex: 1 }}
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
  );
}
