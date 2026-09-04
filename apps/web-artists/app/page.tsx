import Link from 'next/link';

import { MusicianForm } from '@/components/MusicianForm';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agendadeboteco.com';

const BENEFITS = [
  {
    title: 'Os bares procuram você',
    description:
      'Seu contato fica com os estabelecimentos que buscam atração para a agenda deles — sem intermediário cobrando comissão.',
  },
  {
    title: 'Pelo seu estilo e pela sua região',
    description:
      'Um bar do norte da ilha que quer samba no sábado encontra quem toca samba no norte da ilha.',
  },
  {
    title: 'Cadastro em um minuto',
    description: 'Seis campos, sem criar conta e sem senha. Depois é só esperar o contato.',
  },
];

export default function ArtistSignupPage() {
  return (
    <main className="min-h-dvh bg-[image:var(--gradient-night)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 lg:py-20">
        <header className="flex flex-col gap-3">
          <Link
            href={SITE_URL}
            className="text-[13px] font-semibold uppercase tracking-widest text-primary"
          >
            Agenda de Boteco
          </Link>
          <h1 className="font-[family-name:var(--font-heading)] text-[32px] font-bold leading-tight text-foreground lg:text-[44px]">
            Toque nos bares da sua cidade
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Cadastre-se para que os estabelecimentos entrem em contato e marquem seu show. É de
            graça, e você só preenche uma vez.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="flex flex-col gap-6">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex flex-col gap-1.5">
                <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-bold text-foreground">
                  {benefit.title}
                </h2>
                <p className="text-[14px] leading-6 text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </section>

          <section>
            <MusicianForm />
          </section>
        </div>
      </div>
    </main>
  );
}
