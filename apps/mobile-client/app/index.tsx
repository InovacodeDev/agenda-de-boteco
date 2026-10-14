import { useAuthStore } from '@agenda/core';
import { Image, Text } from '@agenda/shared-ui-mobile';
import brandLogo from '@assets/logo.png';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type LandingTargetRoute, resolveLandingTargetRoute } from '@/services/landing';

const MIN_DISPLAY_MS = 1200;
const MAX_FALLBACK_MS = 3000;

export default function LandingScreen() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const hasNavigated = useRef(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withTiming(1, { duration: 500 });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    let active = true;

    const navigate = (to: LandingTargetRoute) => {
      if (!active || hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace(to);
    };

    if (status === 'loading') {
      const fallbackTimer = setTimeout(() => {
        navigate('/login');
      }, MAX_FALLBACK_MS);

      return () => {
        active = false;
        clearTimeout(fallbackTimer);
      };
    }

    const runCheck = async () => {
      const startTime = Date.now();
      const targetRoute = await resolveLandingTargetRoute(status);
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_MS - elapsed);

      setTimeout(() => {
        navigate(targetRoute);
      }, remainingTime);
    };

    void runCheck();

    return () => {
      active = false;
    };
  }, [status, router]);


  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <Image
          source={brandLogo}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Agenda de Boteco"
        />
        <Text
          className="font-heading text-primary text-base font-bold uppercase tracking-[0.25em]"
          style={styles.subtitle}
        >
          Estabelecimentos
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  subtitle: {
    marginTop: 16,
    letterSpacing: 4,
  },
});
