import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

const CONTACT_EMAIL = 'contato@inovacode.dev';
const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? '';

export const metadata: Metadata = {
  title: 'Suporte',
  description:
    'Ajuda, contato e tira-dúvidas: a gente tá aqui pra te ouvir e resolver qualquer questão no Agenda de Boteco.',
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

export default function SupportPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(160deg,#1A122B,#0F0F0F)]">
      <header className="mx-auto flex w-full max-w-2xl items-center px-5 pt-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Image src="/logo.png" alt="Agenda de Boteco" width={811} height={582} className="h-7 w-auto" />
          <span>← Voltar</span>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
        <h1 className="mb-1 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
          Suporte
        </h1>
        <p className="mb-6 text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
          Como podemos te ajudar hoje?
        </p>

        <Section title="Fale com a gente">
          <Paragraph>
            Tem alguma dúvida, encontrou algum bug no app, quer sugerir um boteco ou pedir a
            correção de horários e eventos? Escreva para{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            . A gente lê todas as mensagens e responde rapidinho, em até 3 dias úteis.
          </Paragraph>
          <Paragraph>
            Se puder, nos conte qual aparelho você usa (iPhone ou Android) e o que aconteceu — isso
            ajuda a gente a resolver na hora!
          </Paragraph>
        </Section>

        <Section title="Perguntas frequentes">
          <Bullet>
            <span className="text-foreground">O app é gratuito?</span> Sim, 100% gratuito. Você não
            paga nada pra usar, não tem anúncio pulando na tela e não cobramos mensalidade.
          </Bullet>
          <Bullet>
            <span className="text-foreground">Preciso criar conta?</span> Não precisa. Você navega
            pela programação, usa filtros e explora o mapa livremente. A conta só serve se você
            quiser sincronizar seus botecos favoritos entre aparelhos.
          </Bullet>
          <Bullet>
            <span className="text-foreground">Não aparecem bares na minha cidade.</span> Estamos
            começando por Florianópolis e região e crescendo aos poucos. Mande um e-mail pra gente
            dizendo qual cidade você quer ver por aqui!
          </Bullet>
          <Bullet>
            <span className="text-foreground">A informação de um bar ou evento está desatualizada?</span>{' '}
            Mande o nome do local e o que mudou que a gente atualiza rapidinho para manter a agenda
            tinindo.
          </Bullet>
          <Bullet>
            <span className="text-foreground">Sou dono de bar e quero divulgar meus eventos.</span>{' '}
            O painel de estabelecimentos está no forno! Escreva para o e-mail acima que garantimos
            seu acesso antecipado.
          </Bullet>
          <Bullet>
            <span className="text-foreground">O app pede minha localização?</span> Só se você quiser
            que o app calcule os botecos mais perto de onde você tá agora. Se preferir não liberar o
            GPS, sem problemas: basta escolher a cidade na lista e navegar normalmente.
          </Bullet>
        </Section>

        <Section title="Conta e privacidade">
          <Paragraph>
            Sua privacidade é levada a sério. Você pode excluir sua conta e os dados associados a
            qualquer momento pela página de{' '}
            <a
              href={`${WEB_BASE}/app/excluir-conta`}
              className="text-primary underline-offset-4 hover:underline"
            >
              exclusão de conta
            </a>
            . Detalhes sobre o tratamento dos seus dados estão na{' '}
            <a
              href={`${WEB_BASE}/app/privacidade`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Política de Privacidade
            </a>
            .
          </Paragraph>
        </Section>
      </div>
    </main>
  );
}
