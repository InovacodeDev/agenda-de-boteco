import * as ExpoImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

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
}

export function ImagePickerField({
  label,
  value,
  onChange,
  onUpload,
  aspect = [16, 9],
  className,
}: ImagePickerFieldProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <Pressable
        onPress={pickImage}
        disabled={busy}
        className={cn(
          'relative h-44 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface active:opacity-80',
          className,
        )}
      >
        {value ? (
          <>
            <Image
              source={{ uri: value }}
              contentFit="cover"
              className="absolute inset-0 h-full w-full"
            />
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <View className="flex-row items-center gap-2 rounded-xl bg-black/70 px-3 py-1.5">
                <Icon name="pencil" size={14} color="#fafafa" />
                <Text className="font-body-medium text-xs text-white">Alterar imagem</Text>
              </View>
            </View>
          </>
        ) : busy ? (
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

      {error ? (
        <Text className="font-body text-destructive text-xs">{error}</Text>
      ) : null}
    </View>
  );
}
