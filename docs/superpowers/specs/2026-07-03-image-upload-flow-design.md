# Fluxo de upload de imagem no admin — design

Data: 2026-07-03

## Problema

Hoje o painel admin (`@agenda/admin`) não tem upload de imagem. As imagens são
digitadas como URL em campos de texto:

- Estabelecimento: `logo_url`, `cover_url` (single, `TextInput`)
- Evento: `banner_url` (single, `TextInput`), `photo_urls` (múltiplas, `TextArea`
  com uma URL por linha)

Não há preview, validação de imagem nem upload de arquivo. Supabase Storage está
habilitado em `supabase/config.toml` mas nenhum bucket foi criado.

## Objetivo

Substituir os 4 campos por um componente de upload profissional: **dropzone com
preview**, suporte a **múltiplas imagens** onde faz sentido (fotos de evento),
subindo os arquivos ao Supabase Storage e gravando a **URL pública** resultante.
Manter os schemas (`.url()`) e a camada de dados intactos.

## Escopo

Dentro:
- Bucket público `catalog-images` no Supabase Storage + RLS (leitura pública,
  escrita admin-only reusando `is_admin()`).
- Service de upload platform-agnostic em `@agenda/core` (`services/storage.ts`).
- Componente `ImageUpload` no admin (single) e `ImageUploadMulti` (grid com
  reorder), usando dropzone nativo (`<input type=file>` + drag events), sem
  dependência nova.
- Integração nos forms de estabelecimentos e eventos.

Fora (YAGNI por ora):
- Upload no mobile/web (o service fica pronto para reuso, mas a UI não é feita
  agora).
- Crop/edição de imagem, transformações no Storage (Supabase Pro).
- CDN/otimização além da URL pública padrão.

## Arquitetura

### 1. Bucket + RLS (migration)

Nova migration `supabase/migrations/<ts>_catalog_images_bucket.sql`:

- `insert into storage.buckets (id, name, public) values ('catalog-images', 'catalog-images', true)`.
- Policies em `storage.objects` restritas ao bucket:
  - SELECT: público (qualquer um lê — URLs são públicas).
  - INSERT / UPDATE / DELETE: `public.is_admin()` (reusa função existente).

Bucket público → `getPublicUrl` devolve URL estável sem assinatura, e os schemas
`.url()` continuam válidos.

### 2. Service de upload (`@agenda/core`)

`packages/core/src/services/storage.ts`, platform-agnostic (recebe `Blob`, usa
`getConfiguredSupabase().storage`; sem client → lança, como as outras escritas):

```ts
uploadImage(file: Blob, opts: { pathPrefix: string; contentType?: string }): Promise<string>
```

- Gera caminho único: `${pathPrefix}/${crypto.randomUUID()}.${ext}`.
- `.upload(path, file, { contentType, upsert: false })`.
- Retorna `getPublicUrl(path).data.publicUrl`.
- `deleteImage(publicUrl)`: deriva o path da URL pública e `.remove([path])`
  (best-effort; usado ao remover uma foto antes de salvar).

`ext` vem do `file.type` (mapa mime→ext) ou de um `name` quando existir. Sem
`crypto.randomUUID` disponível, cai num id derivado de contador+timestamp
injetado — mas em browser e RN moderno `crypto.randomUUID` existe. **Teste
unitário obrigatório** (regra do AGENTS.md para services): mocka o storage do
client e verifica caminho gerado, contentType, e a URL retornada; verifica que
sem client lança.

### 3. Componente de upload (admin)

`apps/admin/components/ui/ImageUpload.tsx` — dois exports:

- `ImageUpload` (single): value `string` (URL) + `onChange(url)`.
- `ImageUploadMulti` (múltiplo): value `string[]` + `onChange(urls[])`.

Comportamento comum, seguindo o design system (rounded-2xl, surface-elevated,
ring de foco no primary, tipografia var(--font-body) — igual `INPUT_CLASS`):

- **Dropzone**: div com `onDragOver`/`onDragLeave`/`onDrop` + `<input type=file
  accept="image/*" [multiple]>`. Clique abre o seletor; arrastar realça a borda.
- **Validação cliente**: só `image/*`, tamanho ≤ limite (ex. 8MB). Erro por
  arquivo exibido inline.
- **Preview otimista**: `URL.createObjectURL` mostra a miniatura imediatamente;
  spinner sobre ela enquanto sobe; ao concluir, troca para a URL pública e
  revoga o object URL.
- **Colar URL manual**: link discreto "colar URL" abaixo da dropzone abre um
  `TextInput` inline que adiciona a URL sem upload (preserva fluxo Unsplash).
- **Single**: mostra 1 preview; ao ter valor, dropzone vira "trocar imagem" +
  botão remover.
- **Multi (grid + reorder)**: grid de thumbnails; cada uma com botão remover (x)
  e handle de arrastar. **Reorder por HTML5 drag-and-drop nativo** — a ordem do
  array é a ordem exibida no app. Sem `dnd-kit`.
  `// ponytail: HTML5 drag nativo; trocar por dnd-kit se a UX de reorder incomodar.`

### 4. Integração nos forms

- `estabelecimentos/page.tsx`: trocar os dois `Field/TextInput` de `logo_url` e
  `cover_url` por `ImageUpload` (mantendo `Field` para label/erro).
- `eventos/page.tsx`: `banner_url` → `ImageUpload`; `photo_urls` → deixa de ser
  `TextArea` de linhas e passa a ser `ImageUploadMulti`. O `FormState.photo_urls`
  vira `string[]` (hoje é string com `\n`); ajustar `toForm`/`handleSubmit`
  (remove `lines()` para fotos).

Os schemas e services de catálogo **não mudam** — continuam recebendo
`string`/`string[]` de URLs válidas.

## Fluxo de dados

1. Usuário arrasta/solta imagem no `ImageUpload`.
2. Componente valida (tipo/tamanho) → cria object URL para preview → chama
   `uploadImage(file, { pathPrefix: 'establishments' | 'events' })`.
3. Service sobe ao bucket `catalog-images` e devolve URL pública.
4. Componente chama `onChange(url)` (ou append no array) → form atualiza.
5. Submit segue idêntico ao atual: `upsertEstablishment`/`upsertEvent` com URLs.

## Erros

- Upload falha → preview marca erro (ícone + "tentar de novo"), não adiciona ao
  form. Não bloqueia outras imagens do lote.
- Sem Supabase configurado → service lança; componente mostra mensagem clara.
- Arquivo inválido → rejeitado antes do upload, mensagem inline.

## Testes

- `services/storage.test.ts` (obrigatório): caminho gerado, contentType, URL de
  retorno, erro sem client, `deleteImage` derivando path. Mock do
  `client.storage.from().upload/getPublicUrl/remove`.
- Componente: sem framework de teste de UI no admin hoje; verificação manual via
  preview (dropzone, multi, reorder, erro). Lógica pura de validação/derivação de
  ext, se extraída, ganha teste unitário.

## Decisões (trade-offs assumidos)

- **Dropzone nativo, sem react-dropzone**: 40 linhas resolvem; evita dep.
- **Reorder HTML5 nativo, sem dnd-kit**: marcado com `ponytail:`; trocar se UX ruim.
- **Bucket público**: URLs estáveis, schemas `.url()` seguem válidos; escrita
  protegida por RLS admin-only.
- **Service no core, componente no admin**: core é platform-agnostic (não pode
  ter DOM); o service fica pronto para mobile/web reusarem depois.
