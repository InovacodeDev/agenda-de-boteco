import * as ExpoImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

import { Button } from './Button';
import { cn } from './cn';
import { Icon } from './Icon';
import { Image, Pressable, Text, View } from './tw';

export interface ImagePickerFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: Blob) => Promise<string>;
  aspect?: [number, number];
  className?: string;
  /**
   * URL usada só para exibir a prévia (ex.: host de dev reescrito); `value`
   * continua sendo o que é salvo.
   */
  previewUrl?: string;
}

export function ImagePickerField({
  label,
  value,
  onChange,
  onUpload,
  aspect = [16, 9],
  className,
  previewUrl,
}: ImagePickerFieldProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const shownUrl = previewUrl || value;
  const isSquare = aspect[0] === aspect[1];
  const previewFailed = failedUrl === shownUrl;

  const pickImage = async () => {
    try {
      const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso às fotos para você escolher a imagem.',
        );
        return;
      }

      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setBusy(true);
      setError(null);

      const localUri = result.assets[0].uri;
      const res = await fetch(localUri);
      const blob = await res.blob();

      const uploadedUrl = await onUpload(blob);
      onChange(uploadedUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no envio da imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-col gap-1.5">
      {!label ? null : (
        <Text className="font-body-medium text-foreground text-sm">{label}</Text>
      )}

      {value ? (
        <View className={isSquare ? 'flex-row items-center gap-4' : 'flex-col gap-3'}>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={label ? `${label}: trocar imagem` : 'Trocar imagem'}
            accessibilityState={{ busy }}
            onPress={() => void pickImage()}
            disabled={busy}
            className={cn(
              'overflow-hidden rounded-2xl border border-border bg-surface active:opacity-80',
              isSquare ? 'w-28' : 'w-full',
            )}
            style={{ aspectRatio: aspect[0] / aspect[1] }}
          >
            {previewFailed ? (
              <View className="h-full w-full items-center justify-center gap-1.5 p-3">
                <Icon name="warning" size={20} color="#a6a6a6" />
                <Text className="font-body text-muted-foreground text-center text-xs">
                  Não foi possível exibir a imagem atual
                </Text>
              </View>
            ) : (
              <Image
                key={shownUrl}
                source={{ uri: shownUrl }}
                contentFit="cover"
                transition={150}
                onError={() => setFailedUrl(shownUrl)}
                className="h-full w-full"
              />
            )}

            {busy ? (
              <View
                style={StyleSheet.absoluteFill}
                className="items-center justify-center gap-2 bg-black/60"
              >
                <ActivityIndicator size="small" color="#1dd75e" />
                <Text className="font-body-medium text-xs text-white">Enviando…</Text>
              </View>
            ) : null}
          </Pressable>

          <View className={isSquare ? 'min-w-0 flex-1 gap-2.5' : 'gap-2.5'}>
            {isSquare ? (
              <Text className="font-body text-muted-foreground text-xs">
                Imagem cadastrada
              </Text>
            ) : null}
            <Button
              label="Trocar imagem"
              variant="outline"
              busy={busy}
              icon={<Icon name="pencil" size={14} color="#fafafa" />}
              onPress={() => void pickImage()}
              className={isSquare ? 'self-start' : 'self-start px-5'}
            />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `${label}: selecionar imagem` : 'Selecionar imagem'}
          onPress={() => void pickImage()}
          disabled={busy}
          className={cn(
            'h-44 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface active:opacity-80',
            className,
          )}
        >
          {busy ? (
            <View className="items-center justify-center gap-2">
              <ActivityIndicator size="small" color="#1dd75e" />
              <Text className="font-body text-muted-foreground text-xs">Enviando imagem…</Text>
            </View>
          ) : (
            <View className="items-center justify-center gap-2 p-4">
              <Icon name="upload" size={24} color="#737373" />
              <Text className="font-body-medium text-foreground text-sm">
                Toque para selecionar imagem
              </Text>
              <Text className="font-body text-muted-foreground text-xs">
                JPG, PNG ou WEBP até 8MB
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {error ? <Text className="font-body text-destructive text-xs">{error}</Text> : null}
    </View>
  );
}
