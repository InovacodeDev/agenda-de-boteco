'use client';

import {
  createMusicianLead,
  getFriendlyErrorMessage,
  isSupabaseConfigured,
  maskPhoneBR,
  MUSIC_STYLES,
  type MusicianLeadInput,
  musicianLeadSchema,
} from '@agenda/core';
import { useEffect, useRef, useState } from 'react';
import { ZodError } from 'zod';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';
import { issuesToErrors } from '@/lib/formErrors';

type Draft = Omit<MusicianLeadInput, 'musicStyleIds'> & { musicStyleIds: string[] };

const EMPTY_DRAFT: Draft = {
  name: '',
  phone: '',
  region: '',
  musicStyleIds: [],
  instagram: '',
  priceRange: '',
};

export function MusicianForm() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState(false);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  }

  function toggleStyle(id: string) {
    set(
      'musicStyleIds',
      draft.musicStyleIds.includes(id)
        ? draft.musicStyleIds.filter((current) => current !== id)
        : [...draft.musicStyleIds, id],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure('');

    const parsed = musicianLeadSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error));
      return;
    }
    setErrors({});

    setBusy(true);
    try {
      await createMusicianLead(parsed.data);
      setDraft(EMPTY_DRAFT);
      setDone(true);
    } catch (error) {
      // O parse já passou aqui; um ZodError neste ponto seria bug nosso, e a
      // mensagem genérica do getFriendlyErrorMessage não ajudaria o músico.
      setFailure(
        error instanceof ZodError
          ? 'Confira os dados preenchidos e tente novamente.'
          : getFriendlyErrorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  // Sem env do Supabase o envio não tem para onde ir. Avisar aqui é melhor que
  // deixar o músico preencher seis campos e esbarrar num erro genérico no fim.
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="font-heading text-[18px] font-bold text-foreground">
          Cadastro temporariamente indisponível
        </p>
        <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
          Estamos ajustando o formulário. Enquanto isso, escreva para{' '}
          <a
            href="mailto:contato@inovacode.dev?subject=Sou%20m%C3%BAsico%20e%20quero%20me%20cadastrar"
            className="text-primary underline-offset-4 hover:underline"
          >
            contato@inovacode.dev
          </a>{' '}
          que a gente cadastra você.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="font-heading text-[18px] font-bold text-foreground outline-none"
        >
          Recebemos seu cadastro
        </p>
        <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
          Seus dados já estão com a gente. Quando um bar procurar alguém do seu estilo na sua
          região, entramos em contato pelo telefone que você deixou.
        </p>
        <Button className="mt-5" onClick={() => setDone(false)}>
          Cadastrar outro músico
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
    >
      <Field id="musico-nome" label="Nome ou nome da banda" error={errors.name}>
        <TextInput
          id="musico-nome"
          name="name"
          autoComplete="name"
          placeholder="Trio do Cais"
          value={draft.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'musico-nome-error' : undefined}
          onChange={(event) => set('name', event.target.value)}
        />
      </Field>

      <Field id="musico-telefone" label="Telefone (WhatsApp)" error={errors.phone}>
        <TextInput
          id="musico-telefone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(48) 99999-0000"
          value={draft.phone}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'musico-telefone-error' : undefined}
          onChange={(event) => set('phone', maskPhoneBR(event.target.value))}
        />
      </Field>

      <Field
        id="musico-regiao"
        label="Região que você atende"
        error={errors.region}
        hint="Cidade, bairro ou região — do jeito que fizer sentido para você."
      >
        <TextInput
          id="musico-regiao"
          name="region"
          placeholder="Grande Florianópolis"
          value={draft.region}
          aria-invalid={Boolean(errors.region)}
          aria-describedby={
            errors.region ? 'musico-regiao-error musico-regiao-hint' : 'musico-regiao-hint'
          }
          onChange={(event) => set('region', event.target.value)}
        />
      </Field>

      {/* Grupo de checkboxes em vez de <select multiple>: o múltiplo nativo é
          hostil no toque (exige ctrl/cmd) e não mostra o que já foi marcado. */}
      <fieldset
        className="flex flex-col gap-2"
        aria-invalid={Boolean(errors.musicStyleIds)}
        aria-describedby={errors.musicStyleIds ? 'musico-estilos-error' : undefined}
      >
        <legend className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
          Estilo musical
        </legend>
        <div className="flex flex-wrap gap-2">
          {MUSIC_STYLES.map((style) => {
            const selected = draft.musicStyleIds.includes(style.id);
            return (
              <label
                key={style.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors focus-within:ring-2 focus-within:ring-primary ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface-elevated text-muted-foreground hover:text-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  name="musicStyleIds"
                  value={style.id}
                  checked={selected}
                  onChange={() => toggleStyle(style.id)}
                />
                <span aria-hidden>{style.emoji}</span>
                {style.name}
              </label>
            );
          })}
        </div>
        {errors.musicStyleIds ? (
          <span id="musico-estilos-error" className="text-[12px] text-destructive">
            {errors.musicStyleIds}
          </span>
        ) : null}
      </fieldset>

      <Field id="musico-instagram" label="Instagram" error={errors.instagram}>
        <TextInput
          id="musico-instagram"
          name="instagram"
          placeholder="@triodocais"
          value={draft.instagram}
          aria-invalid={Boolean(errors.instagram)}
          aria-describedby={errors.instagram ? 'musico-instagram-error' : undefined}
          onChange={(event) => set('instagram', event.target.value)}
        />
      </Field>

      <Field
        id="musico-cache"
        label="Faixa de valor (opcional)"
        error={errors.priceRange}
        hint="Ajuda o bar a chegar já com uma proposta realista."
      >
        <TextInput
          id="musico-cache"
          name="priceRange"
          placeholder="R$ 500 a R$ 800 por show"
          value={draft.priceRange ?? ''}
          aria-invalid={Boolean(errors.priceRange)}
          aria-describedby={
            errors.priceRange ? 'musico-cache-error musico-cache-hint' : 'musico-cache-hint'
          }
          onChange={(event) => set('priceRange', event.target.value)}
        />
      </Field>

      {failure ? (
        <p role="alert" className="text-[13px] text-destructive">
          {failure}
        </p>
      ) : null}

      <Button type="submit" disabled={busy} className="mt-1 self-start">
        {busy ? 'Enviando…' : 'Quero me cadastrar'}
      </Button>

      <p className="text-[12px] leading-5 text-muted-foreground">
        Seus dados vão só para os estabelecimentos interessados em contratar. Nada é publicado no
        app nem aparece no seu perfil.
      </p>
    </form>
  );
}
