# Entrega gradual — telas "Em construção" (v1)

**Data:** 2026-06-16
**Status:** Aprovado (design)
**Escopo:** `apps/mobile`

## Objetivo

Bloquear temporariamente as telas de **Mapa**, **Avisos** e **detalhe de Estabelecimento**
na v1, substituindo cada uma por uma página "Em construção" caprichada e dentro do padrão
visual da plataforma. As demais experiências (Feed, Favoritos, Perfil, Login, Eventos)
permanecem totalmente funcionais.

**Restrição dura do usuário:** não apagar nada do código existente. As telas originais
ficam intactas; apenas ganham um *gate* que decide entre o conteúdo real e a página
intermediária temporária. Reverter na v2/v3/v4 = trocar uma flag de `false` para `true`.

## Telas afetadas e versão de retorno

| Tela                        | Rota                          | Volta na | Flag                       |
| --------------------------- | ----------------------------- | -------- | -------------------------- |
| Detalhe de Estabelecimento  | `app/establishment/[id].tsx`  | **v2**   | `FEATURES.establishmentDetail` |
| Avisos (aba)                | `app/(tabs)/notifications.tsx`| **v3**   | `FEATURES.notifications`   |
| Mapa (aba)                  | `app/(tabs)/map.tsx`          | **v4**   | `FEATURES.map`             |

**Decisões de escopo (confirmadas com o usuário):**

1. **Estabelecimento:** bloquear apenas a tela de detalhe (`establishment/[id]`). Os cards
   no Feed/Favoritos/carrossel continuam clicáveis e levam à página "Em construção — v2".
   Comportamento previsível e reversível.
2. **Links internos:** não mexer em nenhum ponto que linka para `establishment/[id]`
   (ex.: `EstablishmentCard`, botão "Ver estabelecimento" no detalhe de evento). Apenas a
   rota é interceptada — qualquer navegação a ela cai na página intermediária.
3. **Abas Mapa e Avisos:** permanecem visíveis no tab bar (mantém o layout original
   intacto). Ao tocar, mostram a página "Em construção". Não removemos itens do tab bar.

## Arquitetura

Três peças. Uma config (dados), um componente de apresentação (visual) e três early-returns
nas telas (integração).

### 1. `src/config/features.ts` — fonte única da verdade

```ts
/**
 * Feature flags de entrega gradual. Cada tela bloqueada na v1 renderiza uma
 * página "Em construção" enquanto a flag estiver false. Reverter = trocar para true.
 */
export const FEATURES = {
  /** Detalhe do estabelecimento — libera na v2 */
  establishmentDetail: false,
  /** Aba de avisos/notificações — libera na v3 */
  notifications: false,
  /** Aba de mapa — libera na v4 */
  map: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
```

- Sem leitura de env nem lógica condicional: é uma constante literal. O `as const` deixa o
  TS estreitar `false` literal, então um early-return `if (!FEATURES.map)` é type-safe.
- Unit test (`features.test.ts`): trava o contrato — as três flags existem e são `false` na
  v1. Protege contra reversão acidental antes da hora e documenta o estado esperado.

### 2. `src/components/feedback/UnderConstruction.tsx` — componente visual reutilizável

Componente puro de apresentação (sem estado, sem fetch). Recebe o copy por props e renderiza
a tela no padrão da plataforma. Pasta nova `feedback/` (o repo agrupa por domínio:
`layout/`, `ui/`, `establishment/`, …; `feedback/` acomoda estados de sistema como este).

```ts
export interface UnderConstructionProps {
  /** Rótulo da versão de retorno, ex.: 'v2' */
  version: string;
  /** Ícone temático com glow (ex.: <Icon name="store" .../>) */
  icon: ReactNode;
  /** Título chamativo em font-heading */
  title: string;
  /** Parágrafo descritivo em font-body */
  description: string;
  /** true para telas-aba (mostra logo + sem botão voltar); false para detalhe (mostra voltar) */
  isTab?: boolean;
}
```

**Layout (segue o padrão exato do app):**

- `Screen` com `background={<LinearGradient {...gradientNight} .../>}` — mesmo fundo do
  onboarding/login, reforçando o clima "noite".
- `ScreenHeader`:
  - `isTab` → `showLogo` (igual Avisos/Favoritos hoje).
  - `!isTab` (detalhe de estabelecimento) → `showBack` para voltar.
- Corpo centralizado (`flex-1 items-center justify-center px-8 gap-6`):
  1. **Selo de ícone:** círculo `bg-surface` com o ícone temático em `colors.primary`,
     `style={{ boxShadow: shadows.neon }}` (o glow verde dos CTAs). Diâmetro ~96px.
  2. **Badge de versão:** pílula reutilizando o padrão `GradientBadge` (gradiente
     laranja→rosa) com label `Chega na ${version}`.
  3. **Título** em `font-heading text-foreground text-[26px]` com `headingLetterSpacing`.
  4. **Descrição** em `font-body text-muted-foreground text-center text-[15px] leading-6`.
  5. **CTA** `Button` "Explorar o feed" (`router.replace('/')` em aba; `router.back()` no
     detalhe). Em aba usamos `replace('/')` para levar ao Feed; no detalhe `back()` volta de
     onde veio. Decidir o handler via `isTab`.
- Acessibilidade: o selo de ícone com `accessibilityRole="image"` e label descritivo; título
  e descrição são lidos naturalmente.

### 3. Early-return nas três telas (conteúdo original preservado)

Cada arquivo de tela importa `FEATURES` e o `UnderConstruction` e adiciona um guard **antes**
do conteúdo atual — que permanece 100% intacto abaixo dele.

**`app/(tabs)/map.tsx`:**
```tsx
import { MapScreen } from '@/screens/map/MapScreen';
import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { FEATURES } from '@/config/features';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';

export default function MapTab() {
  if (!FEATURES.map) {
    return (
      <UnderConstruction
        isTab
        version="v4"
        icon={<Icon name="location-dot" color={colors.primary} size={36} />}
        title="O mapa da noite está sendo desenhado"
        description="Em breve você vê todos os rolês perto de você num mapa só, com a rota certinha até a mesa. Vem na v4 — até lá, o feed te guia pela cidade."
      />
    );
  }
  return <MapScreen />;
}
```

**`app/(tabs)/notifications.tsx`:** mesmo padrão, com `version="v3"`, ícone `bell`, copy de
avisos. O componente `NotificationsScreen` original permanece inteiro abaixo do guard.

**`app/establishment/[id].tsx`:** guard `if (!FEATURES.establishmentDetail)` no topo do
componente, antes dos hooks de query.
> **Regra dos hooks:** o early-return precisa vir **antes** de qualquer `useState`/
> `useQuery`/`useLocalSearchParams`, senão a contagem de hooks varia entre renders. Como a
> flag é uma constante de módulo (nunca muda em runtime), o número de hooks é estável em toda
> a vida do app — não há violação das Rules of Hooks. `isTab` fica `false` (mostra voltar).
> Copy de estabelecimento, `version="v2"`, ícone `store`.

### 4. `src/components/ui/iconMap.ts` — novo ícone temático

Adicionar `screwdriver-wrench` (FontAwesome solid — ferramentas, leitura imediata de "em
construção") ao `ICON_MAP`, para uso opcional/futuro e para reforçar a identidade. Os ícones
por tela são os já existentes e contextuais (`store`, `bell`, `location-dot`), mas registrar
o ícone de ferramentas mantém a opção aberta sem custo.

- Import: `import { faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons/faScrewdriverWrench';`
- Entrada: `'screwdriver-wrench': { solid: faScrewdriverWrench },`
- **Atualizar `iconMap.test.ts`:** o teste "exposes the full set of names" trava a lista
  exata; adicionar `'screwdriver-wrench'` ao array esperado. Isso mantém o contrato (a regra
  do projeto: testes como fonte da verdade) — o teste continua garantindo que todo nome
  resolve para uma `IconDefinition` válida.

## Copy final (chamativo, tom "boteco/noite")

**Estabelecimento (v2) — ícone `store`:**
- Título: *Os botecos estão se arrumando*
- Descrição: *Em breve você explora cada bar por dentro: cardápio, fotos, agenda completa e aquele papo de "bora pra cá hoje?". Tá vindo na v2 — aguenta firme que a rodada tá chegando.*

**Avisos (v3) — ícone `bell`:**
- Título: *Os avisos estão a caminho*
- Descrição: *Logo logo a gente te cutuca quando seu bar favorito soltar um show, uma promo ou um happy hour imperdível. Chega na v3 — deixa que a gente avisa, você só aparece.*

**Mapa (v4) — ícone `location-dot`:**
- Título: *O mapa da noite está sendo desenhado*
- Descrição: *Em breve você vê todos os rolês perto de você num mapa só, com a rota certinha até a mesa. Vem na v4 — até lá, o feed te guia pela cidade.*

> Emojis ficam fora do título/descrição por consistência (o app usa emoji só nos chips de
> estilo musical, não em headings). O badge "Chega na vX" carrega o destaque visual.

## Fluxo de dados

`FEATURES` (constante) → guard na tela → `UnderConstruction` (props) → JSX estático.
Sem estado, sem rede, sem efeitos colaterais. CTA dispara navegação via `expo-router`.

## Tratamento de erros

Não há caminhos de erro novos: o componente é estático. As telas originais (com seus estados
de loading/erro) ficam preservadas abaixo do guard, prontas para a v2/v3/v4.

## Testes

Regra do projeto (AGENTS.md): `services` e `utils` exigem unit test; componentes/telas não
são obrigatórios, mas o contrato de config e do iconMap deve ser travado.

1. **`src/config/features.test.ts`** (novo): as três flags existem e são `false` na v1.
   Trava o contrato de entrega gradual.
2. **`src/components/ui/iconMap.test.ts`** (editar): adicionar `'screwdriver-wrench'` à lista
   esperada. Mantém regressão estrutural (todo nome → IconDefinition válida).
3. `UnderConstruction` é apresentação pura — sem teste unitário obrigatório (sem lógica).

## Reversão (v2/v3/v4)

- **v2:** `FEATURES.establishmentDetail = true` + ajustar `features.test.ts`.
- **v3:** `FEATURES.notifications = true` + teste.
- **v4:** `FEATURES.map = true` + teste.

Nenhuma outra mudança — o conteúdo original volta a renderizar automaticamente. O componente
`UnderConstruction`, a config e o ícone podem permanecer no código sem efeito (YAGNI: só
removê-los se nunca mais forem úteis; ficam baratos como estão).

## Arquivos tocados

| Arquivo                                          | Ação    |
| ------------------------------------------------ | ------- |
| `src/config/features.ts`                         | criar   |
| `src/config/features.test.ts`                    | criar   |
| `src/components/feedback/UnderConstruction.tsx`  | criar   |
| `src/components/ui/iconMap.ts`                    | editar (1 ícone) |
| `src/components/ui/iconMap.test.ts`              | editar (1 nome)  |
| `app/(tabs)/map.tsx`                             | editar (guard)   |
| `app/(tabs)/notifications.tsx`                   | editar (guard)   |
| `app/establishment/[id].tsx`                     | editar (guard)   |

Nenhuma linha de lógica existente é removida.
