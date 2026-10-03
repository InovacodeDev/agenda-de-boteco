import { Screen, ScreenHeader, ScrollView, Text, View } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Screen className="bg-background">
      <ScreenHeader title="Política de Privacidade" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-6">
        <View className="mx-auto w-full max-w-2xl flex-col gap-5">
          <Text className="font-heading text-foreground text-xl font-bold">
            Privacidade e Proteção de Dados (LGPD)
          </Text>
          <Text className="font-body text-muted-foreground text-sm leading-relaxed">
            O Agenda de Boteco preza pela transparência e segurança de todos os dados gerenciados em nossa plataforma, em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </Text>

          <Text className="font-heading text-foreground mt-2 text-base font-semibold">
            1. Dados de Operadores e Bares
          </Text>
          <Text className="font-body text-muted-foreground text-sm leading-relaxed">
            Coletamos informações cadastrais necessárias para a divulgação do seu estabelecimento e eventos, como nome fantasia, endereço, telefones comerciais, redes sociais e programação cultural.
          </Text>

          <Text className="font-heading text-foreground mt-2 text-base font-semibold">
            2. Segurança e Armazenamento
          </Text>
          <Text className="font-body text-muted-foreground text-sm leading-relaxed">
            Todas as conexões são criptografadas via HTTPS. Senhas e tokens de autenticação não são acessíveis por nossa equipe e são armazenados com hash seguro.
          </Text>

          <Text className="font-heading text-foreground mt-2 text-base font-semibold">
            3. Direitos do Titular e Exclusão
          </Text>
          <Text className="font-body text-muted-foreground text-sm leading-relaxed">
            Você pode atualizar suas informações a qualquer momento através do perfil do estabelecimento ou solicitar a exclusão definitiva da sua conta e de todos os dados associados na aba de Configurações.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
