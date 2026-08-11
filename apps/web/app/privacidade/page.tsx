import type { Metadata } from 'next';

const LAST_UPDATED = '16 de junho de 2026';
const CONTACT_EMAIL = 'contato@inovacode.dev';

export const metadata: Metadata = {
  title: 'Política de Privacidade · Agenda de Boteco',
  description: 'Como o Agenda de Boteco coleta, usa e protege seus dados.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 flex flex-col gap-2">
      <h2 className="font-[family-name:var(--font-heading)] text-[18px] font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] font-[family-name:var(--font-body)] leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 pl-1">
      <span className="text-[15px] leading-6 text-primary">•</span>
      <span className="flex-1 text-[15px] font-[family-name:var(--font-body)] leading-6 text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
        Política de Privacidade
      </h1>
      <p className="mb-6 text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
        Agenda de Boteco · Última atualização: {LAST_UPDATED}
      </p>

      <div className="mb-6">
        <Paragraph>
          Esta Política de Privacidade descreve como o aplicativo Agenda de Boteco (“app”, “nós”)
          coleta, usa e protege as informações de quem usa o app. Ao usar o Agenda de Boteco, você
          concorda com as práticas descritas aqui.
        </Paragraph>
      </div>

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
          <span className="text-foreground">Localização precisa (GPS).</span> Coletada somente
          quando você toca para usar sua localização ou ativa o filtro “perto de mim”, para mostrar
          bares e eventos próximos. Você pode recusar — nesse caso usamos o centro da cidade que
          você escolheu. A localização não é armazenada nem usada para rastreamento ou publicidade.
        </Bullet>
        <Bullet>
          <span className="text-foreground">E-mail e nome.</span> Coletados apenas se você criar uma
          conta ou fizer login (por e-mail, Google ou Apple), para identificar você e sincronizar
          seus favoritos entre dispositivos.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Favoritos e preferências.</span> Os eventos e
          estabelecimentos que você favorita, a cidade selecionada e seus filtros de busca. Ficam no
          seu dispositivo e, se você estiver logado, também na sua conta para sincronização.
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
          <span className="text-foreground">Supabase</span> — armazena com segurança sua conta
          (e-mail, nome) e seus favoritos/preferências quando você está logado.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Google Maps Platform</span> — exibe mapas e calcula
          rotas a partir de coordenadas; está sujeito à Política de Privacidade do Google.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Google e Apple (login social)</span> — apenas se você
          escolher entrar com essas contas, para autenticar você.
        </Bullet>
        <Paragraph>
          Não vendemos seus dados pessoais e não os compartilhamos para fins de marketing.
        </Paragraph>
      </Section>

      <Section title="5. Segurança e retenção">
        <Paragraph>
          O acesso aos dados é protegido por regras de segurança no servidor (cada pessoa só acessa
          os próprios favoritos) e transmitido por conexões criptografadas (HTTPS). Mantemos os
          dados da sua conta enquanto ela existir. Ao excluir a conta, os dados associados são
          removidos.
        </Paragraph>
      </Section>

      <Section title="6. Seus direitos">
        <Paragraph>
          Você pode, a qualquer momento, acessar, corrigir ou excluir os dados da sua conta, revogar
          a permissão de localização nas configurações do dispositivo e solicitar a exclusão da sua
          conta entrando em contato pelo e-mail abaixo. Conforme a LGPD, você também pode pedir
          informações sobre o tratamento dos seus dados.
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
    </main>
  );
}
