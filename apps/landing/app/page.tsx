import Image from 'next/image';

import { FeedPreview, FiltersPreview, MapPreview } from '@/components/AppPreview';
import { DownloadButtons } from '@/components/DownloadButtons';
import {
  BellIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  HeartIcon,
  MapPinIcon,
  MusicIcon,
  SlidersIcon,
} from '@/components/icons';

// Em produção os apps vivem sob /app e /admin no mesmo domínio (rewrites do
// vercel.json), então o path relativo basta. Em dev, apontar para as URLs dos
// apps rodando em portas próprias via env (o basePath deles já inclui /app|/admin).
const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? '';
const ARTISTS_BASE = process.env.NEXT_PUBLIC_ARTISTS_URL ?? '';
const WEB_CLIENT_BASE = process.env.NEXT_PUBLIC_WEB_CLIENT_URL ?? '';
const CONTACT_EMAIL = 'contato@inovacode.dev';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="max-w-2xl font-heading text-[28px] font-bold leading-tight text-foreground sm:text-[36px]">
      {children}
    </h2>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl text-[16px] leading-7 text-muted-foreground">{children}</p>;
}

const FEATURES: readonly { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <CalendarIcon size={22} />,
    title: 'A programação de verdade',
    text: 'Samba de raiz, pop rock, sertanejo ou roda de choro. Saiba quem vai tocar, que horas começa e o valor do couvert antes de pedir a corrida.',
  },
  {
    icon: <SlidersIcon size={22} />,
    title: 'Filtros do seu jeito',
    text: 'Mesa na calçada? Aceita seu cachorro? Tem telão pro clássico ou opção vegana no cardápio? Marque o que você não abre mão e ache o lugar certo.',
  },
  {
    icon: <MapPinIcon size={22} />,
    title: 'Pertinho de onde você tá',
    text: 'Bateu vontade de esticar a conversa? Veja os botecos abertos a poucos minutos de caminhada de onde você está agora.',
  },
  {
    icon: <MusicIcon size={22} />,
    title: 'Semáforo em tempo real',
    text: 'Sinal verde pra quem tá no auge, amarelo pra quem tá aquecendo e vermelho pra quando o som já acabou. Sem dar de cara com a banda guardando os cabos.',
  },
  {
    icon: <HeartIcon size={22} />,
    title: 'Seus botecos do coração',
    text: 'Guarde aquele bar aconchegante ou o show do próximo sábado na sua lista. Criou sua conta, seus favoritos vão com você em qualquer aparelho.',
  },
  {
    icon: <BellIcon size={22} />,
    title: 'Lembretes pra não esquecer',
    text: 'Receba um toque quando aquele boteco que você adora lançar a programação da semana ou pintar um som no seu estilo.',
  },
];

const OWNER_CTA_SOON = 'Painel para bares quase pronto: avise a gente para participar do teste antecipado';

const OWNER_BENEFITS: readonly string[] = [
  'Divulgue sua programação em dois minutos: foto, horário, couvert e atrações',
  'Perfil completo com fotos da casa, cardápio, WhatsApp para reservas e localização',
  'Destaque seus diferenciais: mesa na calçada, pet friendly, sinuca, telão ou opções veganas',
  'Fale direto com clientes do seu bairro que já estão na rua procurando onde sentar',
];

const FAQ: readonly { question: string; answer: React.ReactNode }[] = [
  {
    question: 'O app é gratuito?',
    answer:
      'Sim, 100% gratuito. Você não paga nada para usar, não tem propaganda pulando na tela e nem cobrança surpresa.',
  },
  {
    question: 'Preciso criar conta para usar?',
    answer:
      'Não precisa de nada. Dá pra abrir, pesquisar a programação completa, usar os filtros e olhar o mapa livremente. A conta só serve se você quiser sincronizar seus bares favoritos entre o celular e o computador.',
  },
  {
    question: 'Minha cidade já está no app?',
    answer: (
      <>
        Estamos dando os primeiros passos por Florianópolis e região, afinando cada detalhe. Se você quer o Agenda de Boteco na sua cidade,{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Quero%20o%20Agenda%20de%20Boteco%20na%20minha%20cidade`}
          className="text-primary underline-offset-4 hover:underline"
        >
          manda uma mensagem pra gente
        </a>
        ! Queremos levar essa roda pra mais lugares.
      </>
    ),
  },
  {
    question: 'O app precisa da minha localização?',
    answer:
      'Só se você quiser que a gente calcule os botecos mais pertinho de você naquele momento. Se preferir não liberar o GPS, tudo bem: basta escolher sua cidade na lista e navegar normalmente.',
  },
  {
    question: 'Sou dono de bar. Como divulgo meus eventos?',
    answer: (
      <>
        O painel para donos de bar e produtores de eventos está no forno! Se você quer colocar sua casa no mapa e receber clientes desde o primeiro dia,{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Quero%20saber%20do%20painel%20para%20bares`}
          className="text-primary underline-offset-4 hover:underline"
        >
          deixe seu contato aqui
        </a>{' '}
        que te avisamos assim que liberar.
      </>
    ),
  },
];

export default function LandingPage() {
  return (
    <main className="bg-[linear-gradient(160deg,#1A122B,#0F0F0F)]">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* Brilho de fundo atrás do hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-130 w-205 -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
          style={{ background: 'radial-gradient(circle,#1DD75E,transparent 70%)' }}
        />

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-7">
          <Image
            src="/logo.png"
            alt="Agenda de Boteco"
            width={811}
            height={582}
            priority
            className="h-9 w-auto"
          />
          <nav className="flex items-center gap-5 text-[13px] font-semibold text-muted-foreground">
            <a href="#recursos" className="hidden transition-colors hover:text-foreground sm:block">
              Recursos
            </a>
            <a href="#para-bares" className="hidden transition-colors hover:text-foreground sm:block">
              Para bares
            </a>
            <a href={`${WEB_BASE}/app`} className="text-primary transition-opacity hover:opacity-80">
              Abrir app web
            </a>
          </nav>
        </header>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_auto] lg:py-24">
          <div className="flex flex-col items-start gap-6">
            <span className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Começando pelas mesas de Florianópolis e região
            </span>

            <h1 className="font-heading text-[40px] font-bold leading-[1.05] text-foreground sm:text-[58px]">
              O que tá rolando hoje no{' '}
              <span className="bg-[linear-gradient(135deg,#1DD75E,#1AE6C3)] bg-clip-text text-transparent">
                boteco
              </span>{' '}
              perto de você
            </h1>

            <Lead>
              Chega de vasculhar stories no Instagram ou dar com a cara na porta. Encontre samba,
              rock, sertanejo ou a transmissão do clássico a poucos passos de você — com horário,
              couvert e clima da casa atualizados.
            </Lead>

            <DownloadButtons />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckIcon size={14} className="text-primary" /> 100% grátis, sem anúncio chato
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon size={14} className="text-primary" /> Nem precisa de cadastro pra olhar
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon size={14} className="text-primary" /> No celular ou direto no navegador
              </span>
            </div>
          </div>

          <div className="justify-self-center lg:justify-self-end">
            <FeedPreview />
          </div>
        </div>
      </section>

      {/* ---------------- Recursos ---------------- */}
      <section id="recursos" className="border-t border-border/60 bg-background/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-3">
            <SectionLabel>Pra acertar no rolê</SectionLabel>
            <SectionTitle>Seu rolê decidido antes da primeira rodada</SectionTitle>
            <Lead>
              Sabe aquele grupo do WhatsApp onde ninguém decide onde ir? O Agenda de Boteco junta o
              som ao vivo, a cerveja gelada e os detalhes da casa pra você bater o martelo na hora.
            </Lead>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {feature.icon}
                </span>
                <h3 className="font-heading text-[17px] font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-6 text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Previews ---------------- */}
      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-3">
            <SectionLabel>Na palma da mão</SectionLabel>
            <SectionTitle>Direto ao ponto, como tem que ser</SectionTitle>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center gap-5 text-center">
              <FiltersPreview />
              <div className="flex flex-col gap-1.5">
                <h3 className="font-heading text-[17px] font-bold text-foreground">
                  Filtre como você pensa
                </h3>
                <p className="text-[14px] leading-6 text-muted-foreground">
                  Escolha o estilo musical, a distância e o que não pode faltar na mesa. Os
                  resultados atualizam na hora, sem enrolação.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 text-center">
              <MapPreview />
              <div className="flex flex-col gap-1.5">
                <h3 className="font-heading text-[17px] font-bold text-foreground">
                  Abra o mapa e ache a mesa
                </h3>
                <p className="text-[14px] leading-6 text-muted-foreground">
                  Descubra botecos escondidos no seu bairro com distância exata, avaliação de quem já
                  foi e se a porta tá aberta agora.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 text-center">
              <FeedPreview />
              <div className="flex flex-col gap-1.5">
                <h3 className="font-heading text-[17px] font-bold text-foreground">
                  Escolha pelo som ou pela casa
                </h3>
                <p className="text-[14px] leading-6 text-muted-foreground">
                  Navegue entre a atração da noite ou pelo bar que você já confia, mantendo seus
                  filtros intactos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Para donos de bar ---------------- */}
      <section id="para-bares" className="border-t border-border/60 bg-background/40">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <SectionLabel>Para quem faz a noite acontecer</SectionLabel>
            <SectionTitle>Sua casa cheia de gente que procura exatamente o seu clima</SectionTitle>
            <Lead>
              Pare de brigar com o algoritmo das redes sociais. No Agenda de Boteco, quem procura um
              pagode ao vivo, uma mesa ao ar livre ou chopp artesanal no seu bairro encontra seu bar
              no momento exato em que decide onde passar a noite.
            </Lead>

            <ul className="flex flex-col gap-3">
              {OWNER_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3">
                  <CheckIcon size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span className="text-[15px] leading-6 text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Cadastro de bares ainda não está aberto: <span> em vez de <a>
                mantém os CTAs fora da ordem de foco e sem destino navegável,
                em vez de só parecerem desabilitados. */}
            <div className="mt-1 flex flex-col items-start gap-3">
              <div className="flex flex-wrap gap-3">
                <span
                  aria-disabled
                  title={OWNER_CTA_SOON}
                  className="flex h-12 cursor-not-allowed items-center justify-center rounded-full bg-primary px-6 text-[14px] font-semibold text-primary-foreground opacity-40"
                >
                  Cadastrar meu bar
                </span>
                <span
                  aria-disabled
                  title={OWNER_CTA_SOON}
                  className="flex h-12 cursor-not-allowed items-center justify-center rounded-full border border-border px-6 text-[14px] font-semibold text-foreground opacity-40"
                >
                  Acessar o painel
                </span>
              </div>
              {/* O title é tooltip só no desktop com mouse; o texto visível
                  garante que touch e leitor de tela também recebam o aviso. */}
              <p className="text-[13px] text-muted-foreground">{OWNER_CTA_SOON}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2.5 border-b border-border pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ChartIcon size={18} />
              </span>
              <div>
                <p className="font-heading text-[14px] font-bold text-foreground">
                  Painel do estabelecimento
                </p>
                <p className="text-[11px] text-muted-foreground">Boteco do Cais · Centro</p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-border">
              {[
                { name: 'Samba do Cais', when: 'Hoje · 20h', tone: 'text-primary', state: 'No ar' },
                {
                  name: 'Roda de Choro',
                  when: 'Sábado · 19h',
                  tone: 'text-primary',
                  state: 'No ar',
                },
                {
                  name: 'Sertanejo na Varanda',
                  when: 'Próx. sexta · 21h',
                  tone: 'text-accent',
                  state: 'Rascunho',
                },
              ].map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">{row.when}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold ${row.tone}`}>
                    {row.state}
                  </span>
                </div>
              ))}
            </div>

            <span className="mt-2 flex h-10 items-center justify-center rounded-full border border-dashed border-border text-[12px] font-semibold text-muted-foreground">
              + Novo evento
            </span>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <div className="flex flex-col gap-3">
            <SectionLabel>Sem letras miúdas</SectionLabel>
            <SectionTitle>Tudo o que você precisa saber</SectionTitle>
          </div>

          <div className="mt-10 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-border bg-card px-5 py-4 open:bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-foreground">
                  {item.question}
                  <span
                    aria-hidden
                    className="shrink-0 text-[18px] leading-none text-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>

          <p className="mt-8 text-center text-[14px] text-muted-foreground">
            Tem outra dúvida, sugestão de boteco ou quer mandar um alô?{' '}
            <a href="/support" className="text-primary underline-offset-4 hover:underline">
              Fala com a gente no suporte
            </a>
            .
          </p>
        </div>
      </section>

      {/* ---------------- CTA final ---------------- */}
      <section className="border-t border-border/60 bg-background/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center">
          <SectionTitle>Bora encontrar a mesa perfeita?</SectionTitle>
          <Lead>
            Baixe o app ou abra direto no navegador. O chopp tá gelado e a música já vai começar.
          </Lead>
          <div className="flex flex-col items-center gap-4">
            <DownloadButtons />
            <a
              href={`${WEB_BASE}/app`}
              className="text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              Prefere não baixar nada? Acessar direto pelo navegador →
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-3">
            <Image
              src="/logo.png"
              alt="Agenda de Boteco"
              width={811}
              height={582}
              className="h-9 w-auto self-start"
            />
            <p className="max-w-55 text-[13px] leading-6 text-muted-foreground">
              Música ao vivo, mesa na calçada e os melhores botecos da sua cidade, sem complicação.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-bold text-foreground">App</p>
            <a href={`${WEB_BASE}/app`} className="text-[13px] text-muted-foreground hover:text-foreground">
              Abrir app web
            </a>
            <a href="#recursos" className="text-[13px] text-muted-foreground hover:text-foreground">
              Recursos
            </a>
            <a
              href={`${WEB_BASE}/app/mapa`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Mapa de bares
            </a>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-bold text-foreground">Estabelecimentos</p>
            <a href="#para-bares" className="text-[13px] text-muted-foreground hover:text-foreground">
              Para donos de bar
            </a>
            <a
              href={`${WEB_CLIENT_BASE}/client`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Painel administrativo
            </a>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-bold text-foreground">Para Artistas</p>
            <a
              href={`${ARTISTS_BASE}/artists`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Cadastre-se
            </a>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-bold text-foreground">Ajuda e legal</p>
            <a href="/support" className="text-[13px] text-muted-foreground hover:text-foreground">
              Suporte
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
            <a
              href={`${WEB_BASE}/app/privacidade`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Privacidade
            </a>
            <a
              href={`${WEB_BASE}/app/excluir-conta`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Excluir minha conta
            </a>
          </div>
        </div>

        <div className="border-t border-border/60">
          <p className="mx-auto w-full max-w-6xl px-6 py-6 text-[12px] text-muted-foreground">
            © 2026 Agenda de Boteco
          </p>
        </div>
      </footer>
    </main>
  );
}
