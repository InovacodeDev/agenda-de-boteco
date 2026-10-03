import { getFriendlyErrorMessage, updatePassword } from '@agenda/core';
import { Button, Field, Screen, ScreenHeader, ScrollView, Text, TextInput, View } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export default function NewPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('A confirmação não coincide com a nova senha.');
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      await updatePassword(password);
      Alert.alert('Sucesso', 'Sua senha foi redefinida.', [
        { text: 'OK', onPress: () => router.replace('/(painel)') },
      ]);
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="bg-background">
      <ScreenHeader title="Redefinir Senha" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-6">
        <View className="mx-auto w-full max-w-md flex-col gap-4">
          <Text className="font-body text-muted-foreground text-sm">
            Crie uma nova senha segura para o seu acesso administrativo.
          </Text>

          <Field label="Nova Senha">
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
            />
          </Field>

          <Field label="Confirmar Nova Senha">
            <TextInput
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
            />
          </Field>

          {errorMessage ? (
            <Text className="font-body text-destructive text-xs">{errorMessage}</Text>
          ) : null}

          <Button
            label="Atualizar Senha"
            variant="solid"
            busy={busy}
            onPress={handleSubmit}
            className="mt-2"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
