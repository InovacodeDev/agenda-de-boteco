import { Screen, ScreenHeader, ScrollView, Text, View } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';
import { scrollContentClassName } from '@/lib/screenLayout';

const LAST_UPDATED = '23 de novembro de 2026';
const CONTACT_EMAIL = 'contato@inovacode.dev';

function SectionTitle({ children }: { children: string }) {
  return <Text className="font-heading text-foreground mt-2 text-base font-bold">{children}</Text>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text className="font-body text-muted-foreground text-sm leading-[22px]">{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-2 pl-1">
      <Text className="font-body text-primary text-sm leading-[22px]">•</Text>
      <Text className="font-body text-muted-foreground min-w-0 flex-1 text-sm leading-[22px]">
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();

  return (
    <Screen>
      <ScreenHeader title="Política de Privacidade" onBack={() => router.back()} />
      <ScrollView contentContainerClassName={scrollContentClassName(isTablet)}>
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
            As informações abaixo são comerciais e ficam visíveis no catálogo público do aplicativo:
          </Paragraph>
          <Bullet>
            Nome, descrição, endereço, bairro e cidade — para o cliente encontrar e chegar até o
            bar.
          </Bullet>
          <Bullet>
            WhatsApp e Instagram — para o cliente entrar em contato e acompanhar o estabelecimento.
          </Bullet>
          <Bullet>
            Logo, fotos e cardápio em PDF ou foto — exibidos na página do bar e nos cards do aplicativo.
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
            Se você acessar a lista de artistas cadastrados, verá nome, telefone/WhatsApp, região,
            Instagram, faixa de cachê e estilos musicais informados voluntariamente por eles para
            receberem propostas de show. Use essas informações apenas para contato profissional
            relacionado ao seu estabelecimento. Repassá-las a terceiros ou usá-las para outra
            finalidade é proibido.
          </Paragraph>

          <SectionTitle>4. Métricas do seu estabelecimento</SectionTitle>
          <Paragraph>
            O painel mostra visualizações e cliques (mapa, contato e compartilhamento) na página do
            seu bar. Essas contagens não identificam os usuários: não guardamos quem visualizou ou
            clicou.
          </Paragraph>

          <SectionTitle>5. Serviços que processam esses dados</SectionTitle>
          <Bullet>
            Supabase — autenticação, banco de dados e armazenamento de imagens e cardápios.
          </Bullet>
          <Bullet>
            PostHog — recebe dados de uso do painel (quais telas foram abertas), identificados por
            um código aleatório, nunca pelo seu e-mail. Também registra erros e falhas do app (tipo
            do erro, tela, versão do app e tipo de aparelho), ligados ao mesmo código, sem e-mail,
            telefone ou outros dados pessoais.
          </Bullet>
          <Bullet>
            Google e Apple (login social) — apenas se você escolher entrar com essas contas.
            Recebemos o e-mail e um identificador da conta para criar o seu acesso. Nunca recebemos
            a sua senha.
          </Bullet>
          <Bullet>
            ViaCEP — recebe o CEP que você digita no cadastro do estabelecimento, para sugerir rua,
            bairro e cidade. Não guardamos o CEP.
          </Bullet>

          <SectionTitle>Notificações e atualizações do app</SectionTitle>
          <Bullet>
            Notificações push. Se você ativar, guardamos o token de notificação do aparelho e a
            plataforma (iOS ou Android), ligados à sua conta, apenas para enviar os alertas do
            painel. Também guardamos suas preferências de notificação. Ao desativar as
            notificações nas preferências ou ao sair da conta, o token do aparelho é apagado.
          </Bullet>
          <Bullet>
            Atualizações do app. Ao abrir, o app consulta nosso servidor de atualizações enviando a
            versão do app, a plataforma e o canal de atualização, e baixa a atualização quando
            houver. Os registros de acesso do servidor podem conter seu endereço IP e o horário da
            consulta.
          </Bullet>

          <SectionTitle>6. Seus direitos</SectionTitle>
          <Paragraph>
            Conforme a LGPD, você pode pedir acesso, correção ou exclusão dos dados da sua conta,
            além de informações sobre como são tratados. Escreva para {CONTACT_EMAIL}.
          </Paragraph>

          <SectionTitle>7. Contato</SectionTitle>
          <Paragraph>
            Dúvidas sobre privacidade ou solicitações sobre seus dados: {CONTACT_EMAIL}.
          </Paragraph>
        </View>
      </ScrollView>
    </Screen>
  );
}
