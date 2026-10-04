import { Screen, ScreenHeader, ScrollView, Text, View } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';

const LAST_UPDATED = '3 de setembro de 2026';
const CONTACT_EMAIL = 'contato@inovacode.dev';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="font-heading text-foreground mt-2 text-base font-bold">{children}</Text>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-body text-muted-foreground text-sm leading-relaxed">{children}</Text>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-2 pl-1">
      <Text className="font-body text-primary text-sm leading-relaxed">•</Text>
      <Text className="font-body text-muted-foreground flex-1 text-sm leading-relaxed">
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Screen className="bg-background">
      <ScreenHeader title="Política de Privacidade" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-6">
        <View className="mx-auto w-full max-w-2xl flex-col gap-5">
          <View className="flex-col gap-1">
            <Text className="font-heading text-foreground text-xl font-bold">
              Política de Privacidade
            </Text>
            <Text className="font-body text-muted-foreground text-xs">
              Painel do estabelecimento · Última atualização: {LAST_UPDATED}
            </Text>
          </View>

          <Paragraph>
            Esta página explica como tratamos os dados de quem administra um estabelecimento no
            Agenda de Boteco.
          </Paragraph>

          <SectionTitle>1. Dados da sua conta</SectionTitle>
          <Bullet>
            E-mail. Usado para autenticar seu acesso ao painel, por senha ou por código enviado por
            e-mail.
          </Bullet>
          <Bullet>
            Vínculo com o estabelecimento. Registramos que a sua conta administra determinado bar,
            para que só você possa editar os dados dele.
          </Bullet>

          <SectionTitle>2. Dados do estabelecimento</SectionTitle>
          <Paragraph>
            As informações abaixo são comerciais e ficam visíveis no catálogo público do
            aplicativo:
          </Paragraph>
          <Bullet>
            Nome, descrição, endereço, bairro e cidade — para o cliente encontrar e chegar até o
            bar.
          </Bullet>
          <Bullet>
            WhatsApp e Instagram — para o cliente entrar em contato e acompanhar o estabelecimento.
          </Bullet>
          <Bullet>
            Logo, fotos e cardápio em PDF — exibidos na página do bar e nos cards do aplicativo.
          </Bullet>
          <Bullet>
            Localização do estabelecimento — usada para mostrar o bar no mapa e ordenar resultados
            por proximidade de quem está buscando.
          </Bullet>
          <Paragraph>
            Ao publicar esses dados você declara ter autorização para divulgá-los. Evite incluir
            dados pessoais de funcionários ou clientes nos campos de texto livre.
          </Paragraph>

          <SectionTitle>3. Dados de artistas</SectionTitle>
          <Paragraph>
            Se você acessar a lista de artistas cadastrados, verá nome, contato e região informados
            voluntariamente por eles para receberem propostas de show. Use essas informações apenas
            para contato profissional relacionado ao seu estabelecimento. Repassá-las a terceiros ou
            usá-las para outra finalidade é proibido.
          </Paragraph>

          <SectionTitle>4. Serviços que processam esses dados</SectionTitle>
          <Bullet>
            Supabase — autenticação, banco de dados e armazenamento de imagens e cardápios.
          </Bullet>
          <Bullet>
            PostHog — recebe dados de uso do painel (quais telas foram abertas), identificados por
            um código aleatório, nunca pelo seu e-mail.
          </Bullet>

          <SectionTitle>5. Seus direitos</SectionTitle>
          <Paragraph>
            Conforme a LGPD, você pode pedir acesso, correção ou exclusão dos dados da sua conta,
            além de informações sobre como são tratados. Escreva para {CONTACT_EMAIL}.
          </Paragraph>

          <SectionTitle>6. Contato</SectionTitle>
          <Paragraph>
            Dúvidas sobre privacidade ou solicitações sobre seus dados: {CONTACT_EMAIL}.
          </Paragraph>
        </View>
      </ScrollView>
    </Screen>
  );
}
