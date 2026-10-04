import { Button, Card, Icon, Pressable, Text, View } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';

import { DESTRUCTIVE, FOREGROUND, SectionHeader } from './SectionHeader';

export function DangerZoneSection() {
  const router = useRouter();

  return (
    <Card className="border-destructive/30 bg-destructive/5 p-6">
      <SectionHeader
        icon="shield-warning"
        iconColor={DESTRUCTIVE}
        iconBoxClassName="bg-destructive/15"
        title="Privacidade e Exclusão"
        description="Gerencie a conformidade de dados e o encerramento da sua conta de operador."
      />

      <View className="flex-col gap-6">
        <View className="flex-col gap-2">
          <Text className="font-body text-muted-foreground text-xs leading-relaxed">
            Seus dados são tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            Consulte nossos termos legais a qualquer momento:
          </Text>
          <View className="flex-row pt-1">
            <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}>
              <Text className="font-body-medium text-primary text-xs">Política de Privacidade</Text>
            </Pressable>
          </View>
        </View>

        <View className="border-t border-destructive/20 pt-5">
          <View className="flex-col gap-3">
            <View className="flex-col">
              <Text className="font-heading text-foreground text-sm">Zona de perigo</Text>
              <Text className="font-body text-muted-foreground text-xs">
                Exclua definitivamente sua conta de operador e desvincule o estabelecimento.
              </Text>
            </View>

            <View className="flex-row">
              <Button
                label="Excluir conta"
                variant="destructive"
                icon={<Icon name="trash-can" size={16} color={FOREGROUND} weight="bold" />}
                onPress={() => router.push('/delete-account')}
                className="h-10 px-4"
              />
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}
