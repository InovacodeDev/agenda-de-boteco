import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { headingLetterSpacing } from '@/theme/typography';
import { ScrollView, Text, View } from '@/tw';

/**
 * Política de Privacidade pública.
 *
 * Esta rota existe para satisfazer o requisito de URL HTTPS de política de
 * privacidade exigido por Google Play e App Store (ver docs/plano-de-acao-fase-5.md
 * tarefa 5.1.5). É servida pelo target web (web.output: 'static') em
 * https://agenda-de-boteco.expo.app/privacidade e renderiza no app também.
 *
 * O conteúdo deve permanecer consistente com o Data Safety (Google) e o App
 * Privacy (Apple): localização precisa para funcionalidade, e-mail/nome via login,
 * favoritos/preferências, processadores Supabase e Google Maps. Atualize os três
 * juntos sempre que a coleta mudar.
 */

const LAST_UPDATED = '16 de junho de 2026';
const CONTACT_EMAIL = 'contato@inovacode.dev';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6 gap-2">
      <Text
        className="font-heading text-foreground text-[18px]"
        style={{ letterSpacing: headingLetterSpacing(18) }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-body text-muted-foreground text-[15px] leading-6">{children}</Text>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-2 pl-1">
      <Text className="text-primary text-[15px] leading-6">•</Text>
      <Text className="font-body text-muted-foreground flex-1 text-[15px] leading-6">
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <Screen header={<ScreenHeader title="Política de Privacidade" showBack />}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full px-5 pb-16 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-body text-muted-foreground mb-6 text-[13px]">
          Agenda de Boteco · Última atualização: {LAST_UPDATED}
        </Text>

        <View className="mb-6">
          <Paragraph>
            Esta Política de Privacidade descreve como o aplicativo Agenda de Boteco (“app”, “nós”)
            coleta, usa e protege as informações de quem usa o app. Ao usar o Agenda de Boteco, você
            concorda com as práticas descritas aqui.
          </Paragraph>
        </View>

        <Section title="1. Quem somos">
          <Paragraph>
            O Agenda de Boteco é um app gratuito de descoberta de bares, botecos e eventos de vida
            noturna. Ele não vende bebidas, não processa pagamentos e não exibe anúncios. O app é
            mantido pela Inovacode. Para qualquer dúvida sobre privacidade, escreva para{' '}
            {CONTACT_EMAIL}.
          </Paragraph>
        </Section>

        <Section title="2. Dados que coletamos">
          <Paragraph>Coletamos apenas o necessário para o app funcionar:</Paragraph>
          <Bullet>
            <Text className="text-foreground">Localização precisa (GPS).</Text> Coletada somente
            quando você toca para usar sua localização ou ativa o filtro “perto de mim”, para mostrar
            bares e eventos próximos. Você pode recusar — nesse caso usamos o centro da cidade que
            você escolheu. A localização não é armazenada nem usada para rastreamento ou
            publicidade.
          </Bullet>
          <Bullet>
            <Text className="text-foreground">E-mail e nome.</Text> Coletados apenas se você criar
            uma conta ou fizer login (por e-mail, Google ou Apple), para identificar você e
            sincronizar seus favoritos entre dispositivos.
          </Bullet>
          <Bullet>
            <Text className="text-foreground">Favoritos e preferências.</Text> Os eventos e
            estabelecimentos que você favorita, a cidade selecionada e seus filtros de busca. Ficam
            no seu dispositivo e, se você estiver logado, também na sua conta para sincronização.
          </Bullet>
          <Paragraph>
            Não coletamos telefone, foto, dados financeiros, dados de saúde, identificadores de
            publicidade, dados de uso para analytics nem qualquer informação para rastrear você em
            outros apps ou sites.
          </Paragraph>
        </Section>

        <Section title="3. Como usamos os dados">
          <Bullet>Mostrar bares e eventos relevantes para a sua localização e cidade.</Bullet>
          <Bullet>Manter você conectado e sincronizar seus favoritos entre dispositivos.</Bullet>
          <Bullet>Lembrar suas preferências de busca.</Bullet>
          <Paragraph>
            Não usamos seus dados para publicidade, perfilamento ou venda a terceiros.
          </Paragraph>
        </Section>

        <Section title="4. Compartilhamento com terceiros">
          <Paragraph>
            Usamos provedores de serviço que processam dados estritamente para operar o app:
          </Paragraph>
          <Bullet>
            <Text className="text-foreground">Supabase</Text> — armazena com segurança sua conta
            (e-mail, nome) e seus favoritos/preferências quando você está logado.
          </Bullet>
          <Bullet>
            <Text className="text-foreground">Google Maps Platform</Text> — exibe mapas e calcula
            rotas a partir de coordenadas; está sujeito à Política de Privacidade do Google.
          </Bullet>
          <Bullet>
            <Text className="text-foreground">Google e Apple (login social)</Text> — apenas se você
            escolher entrar com essas contas, para autenticar você.
          </Bullet>
          <Paragraph>
            Não vendemos seus dados pessoais e não os compartilhamos para fins de marketing.
          </Paragraph>
        </Section>

        <Section title="5. Segurança e retenção">
          <Paragraph>
            O acesso aos dados é protegido por regras de segurança no servidor (cada pessoa só
            acessa os próprios favoritos) e transmitido por conexões criptografadas (HTTPS).
            Mantemos os dados da sua conta enquanto ela existir. Ao excluir a conta, os dados
            associados são removidos.
          </Paragraph>
        </Section>

        <Section title="6. Seus direitos">
          <Paragraph>
            Você pode, a qualquer momento, acessar, corrigir ou excluir os dados da sua conta,
            revogar a permissão de localização nas configurações do dispositivo e solicitar a
            exclusão da sua conta entrando em contato pelo e-mail abaixo. Conforme a LGPD, você
            também pode pedir informações sobre o tratamento dos seus dados.
          </Paragraph>
        </Section>

        <Section title="7. Crianças">
          <Paragraph>
            O app trata de ambientes de vida noturna e bebidas alcoólicas e não se destina a menores
            de 18 anos. Não coletamos conscientemente dados de crianças.
          </Paragraph>
        </Section>

        <Section title="8. Alterações nesta política">
          <Paragraph>
            Podemos atualizar esta política. Mudanças relevantes serão refletidas nesta página com
            nova data de atualização.
          </Paragraph>
        </Section>

        <Section title="9. Contato">
          <Paragraph>
            Dúvidas sobre privacidade ou solicitações sobre seus dados: {CONTACT_EMAIL}.
          </Paragraph>
        </Section>
      </ScrollView>
    </Screen>
  );
}
