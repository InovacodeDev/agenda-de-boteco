# Políticas de Privacidade — Finalidade de Cada PII — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a afirmação factualmente falsa sobre analytics nas políticas existentes, declarar a finalidade de cada PII realmente coletada, e criar as políticas ausentes em `web-client` e `web-artists`.

**Architecture:** O texto vive como JSX estático em componentes `Section`/`Paragraph`/`Bullet` já existentes. Web, admin e mobile hoje têm o mesmo texto duplicado em três arquivos — o plano os atualiza em paralelo, mantendo a duplicação (extrair para pacote compartilhado seria refactor não pedido, e o texto precisa divergir por público a partir de agora).

**Tech Stack:** Next.js 15 App Router (RSC estático, sem `'use client'`), React 19, Expo Router no mobile, Tailwind v4.

---

## Contexto que o implementador precisa saber

**O problema mais grave é uma afirmação falsa.** As três políticas atuais dizem, textualmente:

> "Não coletamos telefone, foto, dados financeiros, dados de saúde, identificadores de publicidade, **dados de uso para analytics** nem qualquer informação para rastrear você em outros apps ou sites."

Isso é falso: `configureAnalytics(createPostHogBrowserAdapter(...))` está cabeado nos 5 apps Next (`apps/*/app/providers.tsx`) e no mobile, lendo `NEXT_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_KEY`. Com a env preenchida, coletamos pageviews e `identify` por UUID. O adapter é PII-safe por design (`packages/core/src/services/analytics.ts` documenta que só aceita identificador opaco), mas "não coletamos analytics" continua sendo mentira. Corrigir isso é a Task 1 e é a mais importante do plano.

**Também é falso que não coletamos telefone.** `apps/web-artists/components/MusicianForm.tsx` coleta telefone/WhatsApp de músico. Como a política de `web` fala do app do consumidor, a saída correta não é apagar a frase lá, mas criar a política própria do `web-artists`, que hoje não existe (Task 4).

**Os três arquivos hoje são cópias literais.** `apps/web/app/privacy/page.tsx` e `apps/admin/app/privacy/page.tsx` são idênticos byte a byte; `apps/mobile/app/privacy.tsx` é o mesmo texto em React Native. O docblock do mobile diz "Atualize os três juntos". Mantenha a sincronia de conteúdo comum, mas o admin passa a ter uma seção adicional (público diferente).

**`LAST_UPDATED` precisa mudar em todo arquivo tocado.** O valor atual é `'16 de junho de 2026'`. Toda política alterada passa a `'3 de setembro de 2026'`.

**`web-client` tem uma armadilha de rota.** `apps/web-client/app/(painel)/layout.tsx` é `'use client'` e faz guard de autenticação — uma página dentro de `(painel)` fica atrás do login. A política precisa ser pública, então vai em `apps/web-client/app/privacy/page.tsx` (fora do route group), servida em `/client/privacy`.

**`web-artists` não tem nenhuma subrota hoje.** `apps/web-artists/app/` só tem `layout.tsx`, `page.tsx`, `providers.tsx`, `globals.css`. A página de privacidade será a primeira subrota, em `/artists/privacy`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `apps/web/app/privacy/page.tsx` (modificar) | Política do consumidor: corrigir analytics, declarar finalidades |
| `apps/mobile/app/privacy.tsx` (modificar) | Mesmo texto, versão React Native |
| `apps/admin/app/privacy/page.tsx` (modificar) | Idem + seção do público administrativo |
| `apps/web-client/app/privacy/page.tsx` (criar) | Política do dono de bar |
| `apps/web-artists/app/privacy/page.tsx` (criar) | Política do músico (dados sem login) |
| `apps/web-artists/components/MusicianForm.tsx` (modificar) | Link para a política |
| `apps/web-artists/next.config.ts` (modificar) | Redirect `/privacidade` → `/privacy` |

---

### Task 1: Corrigir a política do `apps/web`

**Files:**
- Modify: `apps/web/app/privacy/page.tsx`

- [ ] **Step 1: Atualizar a data**

Troque a constante no topo:

```tsx
const LAST_UPDATED = '3 de setembro de 2026';
```

- [ ] **Step 2: Substituir a Seção 2 inteira**

Localize `<Section title="2. Dados que coletamos">` e substitua o bloco completo por:

```tsx
      <Section title="2. Dados que coletamos">
        <Paragraph>Coletamos apenas o necessário para o app funcionar:</Paragraph>
        <Bullet>
          <span className="text-foreground">Localização precisa (GPS).</span> Coletada somente
          quando você toca para usar sua localização ou ativa o filtro “perto de mim”, para mostrar
          bares e eventos próximos. Você pode recusar — nesse caso usamos o centro da cidade que
          você escolheu. A localização não é armazenada nos nossos servidores e é arredondada antes
          de qualquer uso interno, nunca sendo usada para rastreamento ou publicidade.
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
        <Bullet>
          <span className="text-foreground">Dados de uso do app.</span> Quais telas são abertas e
          quais ações são realizadas, associados a um identificador aleatório da sua conta — nunca
          ao seu e-mail, telefone ou documento. Servem para entender o que funciona e o que precisa
          melhorar. Detalhes no item 4.
        </Bullet>
        <Paragraph>
          Não coletamos telefone, foto, dados financeiros, dados de saúde, identificadores de
          publicidade nem qualquer informação para rastrear você em outros apps ou sites.
        </Paragraph>
      </Section>
```

A mudança essencial: o bullet novo de "Dados de uso do app" e a remoção de "dados de uso para analytics" da frase final.

- [ ] **Step 3: Acrescentar o PostHog à Seção 4**

Em `<Section title="4. Compartilhamento com terceiros">`, adicione um `<Bullet>` após o de Google/Apple:

```tsx
        <Bullet>
          <span className="text-foreground">PostHog</span> — recebe os dados de uso descritos no
          item 2, identificados apenas por um código aleatório. Nunca enviamos e-mail, telefone,
          documento ou sua localização exata para esse serviço.
        </Bullet>
```

- [ ] **Step 4: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/privacy/page.tsx
git commit -m "Correct analytics disclosure in web privacy policy"
```

---

### Task 2: Espelhar as correções no mobile

**Files:**
- Modify: `apps/mobile/app/privacy.tsx`

- [ ] **Step 1: Atualizar a data**

```tsx
const LAST_UPDATED = '3 de setembro de 2026';
```

- [ ] **Step 2: Substituir a Seção 2**

Mesma alteração da Task 1, com `<Text>` no lugar de `<span>`:

```tsx
        <Section title="2. Dados que coletamos">
          <Paragraph>Coletamos apenas o necessário para o app funcionar:</Paragraph>
          <Bullet>
            <Text className="text-foreground">Localização precisa (GPS).</Text> Coletada somente
            quando você toca para usar sua localização ou ativa o filtro “perto de mim”, para mostrar
            bares e eventos próximos. Você pode recusar — nesse caso usamos o centro da cidade que
            você escolheu. A localização não é armazenada nos nossos servidores e é arredondada antes
            de qualquer uso interno, nunca sendo usada para rastreamento ou publicidade.
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
          <Bullet>
            <Text className="text-foreground">Dados de uso do app.</Text> Quais telas são abertas e
            quais ações são realizadas, associados a um identificador aleatório da sua conta — nunca
            ao seu e-mail, telefone ou documento. Servem para entender o que funciona e o que
            precisa melhorar. Detalhes no item 4.
          </Bullet>
          <Paragraph>
            Não coletamos telefone, foto, dados financeiros, dados de saúde, identificadores de
            publicidade nem qualquer informação para rastrear você em outros apps ou sites.
          </Paragraph>
        </Section>
```

- [ ] **Step 3: Acrescentar o PostHog à Seção 4**

```tsx
          <Bullet>
            <Text className="text-foreground">PostHog</Text> — recebe os dados de uso descritos no
            item 2, identificados apenas por um código aleatório. Nunca enviamos e-mail, telefone,
            documento ou sua localização exata para esse serviço.
          </Bullet>
```

- [ ] **Step 4: Atualizar o docblock do topo**

O docblock atual menciona só Supabase e Google Maps como processadores. Ajuste a frase final:

```tsx
 * O conteúdo deve permanecer consistente com o Data Safety (Google) e o App
 * Privacy (Apple): localização precisa para funcionalidade, e-mail/nome via login,
 * favoritos/preferências, dados de uso via PostHog, processadores Supabase,
 * Google Maps e PostHog. Atualize os três juntos sempre que a coleta mudar.
```

Isso importa porque a declaração de Data Safety da Play Store precisa listar analytics — se o app envia dados de uso e a ficha diz que não, é motivo de rejeição.

- [ ] **Step 5: Verificar typecheck e testes**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile test`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/privacy.tsx
git commit -m "Correct analytics disclosure in mobile privacy policy"
```

---

### Task 3: Adaptar a política do `apps/admin` ao público real

O admin hoje é cópia literal da política do consumidor, mas quem acessa `/admin` é operador interno.

**Files:**
- Modify: `apps/admin/app/privacy/page.tsx`

- [ ] **Step 1: Atualizar a data**

```tsx
const LAST_UPDATED = '3 de setembro de 2026';
```

- [ ] **Step 2: Aplicar as mesmas correções das Tasks 1 e 2**

Substitua a Seção 2 e acrescente o bullet do PostHog na Seção 4, exatamente como na Task 1 (o admin usa `<span>`, igual ao web).

- [ ] **Step 3: Acrescentar a seção do público administrativo**

Insira uma seção nova entre a 2 e a 3, e renumere as seguintes (a 3 vira 4, e assim por diante até a 10):

```tsx
      <Section title="3. Dados de quem administra o catálogo">
        <Paragraph>
          Este painel é de acesso restrito. Para quem entra aqui, também tratamos:
        </Paragraph>
        <Bullet>
          <span className="text-foreground">E-mail de administrador.</span> Usado para autenticar o
          acesso ao painel e registrar quem pode publicar ou alterar conteúdo do catálogo.
        </Bullet>
        <Bullet>
          <span className="text-foreground">Dados dos estabelecimentos cadastrados.</span> Nome,
          endereço, WhatsApp, Instagram, fotos e cardápio do bar são informações comerciais,
          fornecidas para publicação no catálogo público — não são dados pessoais de consumidores.
        </Bullet>
      </Section>
```

Renumere os títulos das seções seguintes: "3. Como usamos os dados" → "4.", "4. Compartilhamento com terceiros" → "5.", e assim por diante até "9. Contato" → "10.".

- [ ] **Step 4: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/admin typecheck && pnpm --filter @agenda/admin lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/privacy/page.tsx
git commit -m "Adapt admin privacy policy to its actual audience"
```

---

### Task 4: Criar a política do `apps/web-artists`

Este é o gap mais crítico: o formulário coleta telefone e Instagram de músico, sem login e sem qualquer aviso de privacidade.

**Files:**
- Create: `apps/web-artists/app/privacy/page.tsx`
- Modify: `apps/web-artists/next.config.ts`

- [ ] **Step 1: Criar a página**

Crie `apps/web-artists/app/privacy/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Adicionar o redirect de `/privacidade`**

`apps/web-artists/next.config.ts` hoje não tem `redirects()`. Substitua o arquivo por:

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/artists',
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // Alias PT para a rota EN, mesmo padrao dos demais apps (issue #68).
  async redirects() {
    return [{ source: '/privacidade', destination: '/privacy', permanent: true }];
  },
};

export default config;
```

- [ ] **Step 3: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web-artists typecheck && pnpm --filter @agenda/web-artists lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web-artists/app/privacy/page.tsx apps/web-artists/next.config.ts
git commit -m "Add privacy policy page for artist signup"
```

---

### Task 5: Linkar a política no formulário de artista

**Files:**
- Modify: `apps/web-artists/components/MusicianForm.tsx`

- [ ] **Step 1: Adicionar o import do Link**

No topo do arquivo, junto dos outros imports:

```tsx
import Link from 'next/link';
```

Respeite a ordenação do `simple-import-sort` — `next/link` vem no bloco de dependências externas.

- [ ] **Step 2: Substituir o parágrafo final pelo texto com link**

Localize o `<p>` logo após o `<Button type="submit">` e substitua por:

```tsx
      <p className="text-[12px] leading-5 text-muted-foreground">
        Seus dados vão só para os estabelecimentos interessados em contratar. Nada é publicado no
        app nem aparece no seu perfil. Saiba mais na{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Política de Privacidade
        </Link>
        .
      </p>
```

O `href="/privacy"` é relativo ao `basePath` `/artists` — o Next resolve para `/artists/privacy` automaticamente, não escreva o basePath à mão.

- [ ] **Step 3: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web-artists typecheck && pnpm --filter @agenda/web-artists lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web-artists/components/MusicianForm.tsx
git commit -m "Link privacy policy from musician signup form"
```

---

### Task 6: Criar a política do `apps/web-client`

**Files:**
- Create: `apps/web-client/app/privacy/page.tsx`

- [ ] **Step 1: Criar a página fora do route group `(painel)`**

A pasta é `apps/web-client/app/privacy/`, **não** `apps/web-client/app/(painel)/privacy/` — dentro do route group ela ficaria atrás do guard de login do layout, e uma política de privacidade precisa ser pública.

Crie `apps/web-client/app/privacy/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Linkar a política na tela de login**

Em `apps/web-client/app/login/page.tsx`, ao final do card (seguindo o padrão que o `apps/admin/app/login/page.tsx` já usa), adicione o import `import Link from 'next/link';` se ainda não existir, e o link:

```tsx
        <Link
          href="/privacy"
          className="text-center text-[12px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Política de Privacidade
        </Link>
```

- [ ] **Step 3: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web-client typecheck && pnpm --filter @agenda/web-client lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web-client/app/privacy/page.tsx apps/web-client/app/login/page.tsx
git commit -m "Add privacy policy page for establishment panel"
```

---

### Task 7: CHANGELOGs e verificação final

**Files:**
- Create/Modify: CHANGELOG da próxima versão de `apps/web`, `apps/admin`, `apps/mobile`, `apps/web-client`, `apps/web-artists`

- [ ] **Step 1: Descobrir as versões**

Run: `node -e "['apps/web','apps/admin','apps/mobile','apps/web-client','apps/web-artists'].forEach(p=>console.log(p, require('./'+p+'/package.json').version))"`
Expected: imprime a versão de cada projeto. Use patch +1 no nome do arquivo.

- [ ] **Step 2: Escrever os bullets (acrescentando, nunca sobrescrevendo)**

`apps/web`, `apps/mobile`, `apps/admin`:

```markdown
- Política de Privacidade atualizada: agora explica quais dados de uso são coletados e para quê
```

`apps/web-client`:

```markdown
- Nova página de Política de Privacidade, explicando o uso dos dados da conta e do estabelecimento
```

`apps/web-artists`:

```markdown
- Nova página de Política de Privacidade, explicando o destino dos dados enviados no cadastro
- Formulário de cadastro passa a linkar a política de privacidade
```

- [ ] **Step 3: Rodar a verificação completa**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: os três passam. Relate o resultado real.

- [ ] **Step 4: Commit**

```bash
git add apps/web/CHANGELOG-alfa-*.md apps/admin/CHANGELOG-alfa-*.md apps/mobile/CHANGELOG-alfa-*.md apps/web-client/CHANGELOG-alfa-*.md apps/web-artists/CHANGELOG-alfa-*.md
git commit -m "Add changelog entries for privacy policy updates"
```

---

## Revisão humana obrigatória antes de publicar

O texto acima é uma minuta factual construída a partir do mapeamento técnico de PII — não é parecer jurídico. Antes de ir para produção, alguém com responsabilidade jurídica deve revisar, especialmente:

- Se a base legal declarada para cada dado está correta.
- Se a declaração de Data Safety da Play Store e o App Privacy da App Store foram atualizados junto com o texto do mobile (a Task 2 muda o que declaramos coletar — a ficha da loja precisa acompanhar, ou vira motivo de rejeição na revisão).
