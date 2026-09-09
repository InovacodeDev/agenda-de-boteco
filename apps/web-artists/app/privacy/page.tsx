import type { Metadata } from 'next';

const LAST_UPDATED = '3 de setembro de 2026';
const CONTACT_EMAIL = 'contato@inovacode.dev';

export const metadata: Metadata = {
  title: 'Política de Privacidade · Agenda de Boteco para Artistas',
  description: 'Como tratamos os dados que você envia no cadastro de artista.',
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

export default function ArtistPrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
        Política de Privacidade
      </h1>
      <p className="mb-6 text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
        Cadastro de artistas · Última atualização: {LAST_UPDATED}
      </p>

      <div className="mb-6">
        <Paragraph>
          Esta página explica o que fazemos com as informações que você preenche no cadastro de
          artista do Agenda de Boteco. O cadastro é voluntário e não exige criar conta.
        </Paragraph>
      </div>

      <Section title="1. Dados que você nos envia">
        <Bullet>
          <span className="text-foreground">Nome artístico ou nome da banda.</span> Identifica você
          para o estabelecimento que procura atração.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Telefone / WhatsApp.</span> É por onde o bar interessado
          entra em contato para negociar o show. Este é o dado mais sensível do cadastro e existe
          exatamente para essa finalidade.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Instagram (opcional).</span> Permite que o bar veja seu
          trabalho antes de chamar.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Região de atuação e estilos musicais.</span> Usados para
          que o cadastro apareça para os bares certos.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Faixa de valor (opcional).</span> Ajuda o bar a chegar
          com uma proposta realista.
        </Bullet>
      </Section>

      <Section title="2. Quem vê esses dados">
        <Paragraph>
          Seu cadastro fica visível para a equipe do Agenda de Boteco e para os estabelecimentos
          parceiros que buscam atrações. Ele não é publicado no aplicativo público, não aparece em
          buscadores e não é exibido a outros artistas.
        </Paragraph>
        <Paragraph>
          Não vendemos seus dados e não os usamos para publicidade.
        </Paragraph>
      </Section>

      <Section title="3. Serviços que processam esses dados">
        <Bullet>
          <span className="text-foreground">Supabase</span> — armazena o cadastro com segurança, com
          acesso restrito por regras no servidor.
        </Bullet>
        <Bullet>
          <span className="text-foreground">PostHog</span> — recebe apenas dados de uso da página
          (quais telas foram abertas), sem nome, telefone ou Instagram.
        </Bullet>
      </Section>

      <Section title="4. Por quanto tempo guardamos">
        <Paragraph>
          Mantemos o cadastro enquanto ele for útil para conectar você a estabelecimentos. Você pode
          pedir a remoção a qualquer momento pelo e-mail abaixo, e ela é feita sem custo.
        </Paragraph>
      </Section>

      <Section title="5. Seus direitos">
        <Paragraph>
          Conforme a LGPD, você pode pedir acesso, correção ou exclusão dos seus dados, além de
          informações sobre como eles são tratados. Basta escrever para {CONTACT_EMAIL}.
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
