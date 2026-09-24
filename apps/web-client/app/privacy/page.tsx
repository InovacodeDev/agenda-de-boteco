import type { Metadata } from 'next';

const LAST_UPDATED = '3 de setembro de 2026';
const CONTACT_EMAIL = 'contato@inovacode.dev';

export const metadata: Metadata = {
  title: 'Política de Privacidade · Painel do Estabelecimento',
  description: 'Como tratamos os dados da sua conta e do seu estabelecimento.',
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

export default function ClientPrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
        Política de Privacidade
      </h1>
      <p className="mb-6 text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
        Painel do estabelecimento · Última atualização: {LAST_UPDATED}
      </p>

      <div className="mb-6">
        <Paragraph>
          Esta página explica como tratamos os dados de quem administra um estabelecimento no Agenda
          de Boteco.
        </Paragraph>
      </div>

      <Section title="1. Dados da sua conta">
        <Bullet>
          <span className="text-foreground">E-mail.</span> Usado para autenticar seu acesso ao
          painel, por senha ou por código enviado por e-mail.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Vínculo com o estabelecimento.</span> Registramos que a
          sua conta administra determinado bar, para que só você possa editar os dados dele.
        </Bullet>
      </Section>

      <Section title="2. Dados do estabelecimento">
        <Paragraph>
          As informações abaixo são comerciais e ficam visíveis no catálogo público do aplicativo:
        </Paragraph>
        <Bullet>
          Nome, descrição, endereço, bairro e cidade — para o cliente encontrar e chegar até o bar.
        </Bullet>
        <Bullet>
          WhatsApp e Instagram — para o cliente entrar em contato e acompanhar o estabelecimento.
        </Bullet>
        <Bullet>
          Logo, fotos e cardápio em PDF — exibidos na página do bar e nos cards do aplicativo.
        </Bullet>
        <Bullet>
          Localização do estabelecimento — usada para mostrar o bar no mapa e ordenar resultados por
          proximidade de quem está buscando.
        </Bullet>
        <Paragraph>
          Ao publicar esses dados você declara ter autorização para divulgá-los. Evite incluir dados
          pessoais de funcionários ou clientes nos campos de texto livre.
        </Paragraph>
      </Section>

      <Section title="3. Dados de artistas">
        <Paragraph>
          Se você acessar a lista de artistas cadastrados, verá nome, contato e região informados
          voluntariamente por eles para receberem propostas de show. Use essas informações apenas
          para contato profissional relacionado ao seu estabelecimento. Repassá-las a terceiros ou
          usá-las para outra finalidade é proibido.
        </Paragraph>
      </Section>

      <Section title="4. Serviços que processam esses dados">
        <Bullet>
          <span className="text-foreground">Supabase</span> — autenticação, banco de dados e
          armazenamento de imagens e cardápios.
        </Bullet>
        <Bullet>
          <span className="text-foreground">PostHog</span> — recebe dados de uso do painel (quais
          telas foram abertas), identificados por um código aleatório, nunca pelo seu e-mail.
        </Bullet>
      </Section>

      <Section title="5. Seus direitos">
        <Paragraph>
          Conforme a LGPD, você pode pedir acesso, correção ou exclusão dos dados da sua conta, além
          de informações sobre como são tratados. Escreva para {CONTACT_EMAIL}.
        </Paragraph>
      </Section>

      <Section title="6. Contato">
        <Paragraph>
          Dúvidas sobre privacidade ou solicitações sobre seus dados: {CONTACT_EMAIL}.
        </Paragraph>
      </Section>
    </main>
  );
}
