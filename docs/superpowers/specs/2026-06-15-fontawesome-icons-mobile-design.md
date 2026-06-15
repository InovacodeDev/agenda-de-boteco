# Migração de ícones Lucide → Font Awesome Free (Mobile)

**Data:** 2026-06-15
**Escopo:** `apps/mobile` apenas (Web fora de escopo por ora)
**Status:** Aprovado para planejamento

## Objetivo

Substituir 100% dos ícones de `lucide-react-native` por **Font Awesome Free v7** no app mobile, introduzindo um **componente `Icon` centralizado** (que hoje não existe) com API por nome (string). Logos de marca (Apple, Google) passam a usar `@fortawesome/free-brands-svg-icons`. As cores continuam vindo de `src/theme/colors.ts` exatamente como hoje.

## Motivação

- O pedido do usuário: usar Font Awesome (modo free) para renderizar os ícones no mobile, incluindo logos de empresas via Font Awesome Brands.
- O código atual importa `lucide-react-native` diretamente em 16 arquivos, sem abstração. Centralizar em um componente `Icon` isola a biblioteca: uma futura troca de lib (ou inclusão de Pro) vira edição de um único arquivo.
- Font Awesome Free cobre todos os 25 ícones de UI em uso + os brand icons (Apple/Google) que o Lucide não oferece.

## Viabilidade técnica (confirmada)

- Pré-requisito nativo: `react-native-svg@15.15.4` **já está instalado** (peer dependency do FA é `>=11`). Satisfeito.
- **Não requer config plugin nativo nem prebuild adicional.** Funciona no managed workflow do Expo SDK 56.
- Font Awesome Free é gratuito para uso comercial: ícones CC BY 4.0, código MIT. Brand icons continuam sendo trademarks dos donos (relevante para diretrizes de "Sign in with Apple/Google", mas a licença do SVG é free).

## Decisões de design (travadas)

1. **Escopo:** substituir TUDO por FA + criar abstração (componente `Icon` centralizado). Remover `lucide-react-native` ao final.
2. **Imports:** deep imports (`@fortawesome/free-solid-svg-icons/faStar`) — à prova de balas para Metro, melhor bundle size.
3. **API do `Icon`:** por nome (string), com union type type-safe. Mapa central nome→ícone FA.
4. **Cores:** manter `colors.ts` como hoje. `Icon` recebe `color={colors.primary}` e repassa ao `FontAwesomeIcon`. Zero mudança no sistema de cores.
5. **Sparkles:** `faWandMagicSparkles` (free; `faSparkles` é Pro-only).
6. **Look outline:** usar `variant="regular"` onde o FA free oferece (Clock, Calendar, Bell, Mail, User, Comment), aproximando do look outline do Lucide.

## Pacotes a adicionar (pnpm)

```
@fortawesome/fontawesome-svg-core@^7
@fortawesome/react-native-fontawesome@^1
@fortawesome/free-solid-svg-icons@^7
@fortawesome/free-regular-svg-icons@^7
@fortawesome/free-brands-svg-icons@^7
```

`react-native-svg@15.15.4` já presente. Ao final, **remover** `lucide-react-native` do `package.json`.

## Componente `Icon` — contrato

Arquivo: `apps/mobile/src/components/ui/Icon.tsx`

### API pública

```tsx
export type IconName = /* union de ~26 chaves kebab-case */;
export type IconVariant = 'solid' | 'regular' | 'brands';

export interface IconProps {
  name: IconName;
  variant?: IconVariant; // default 'solid' (ou 'brands' implícito para apple/google)
  color?: string;        // repassado ao FontAwesomeIcon
  size?: number;         // repassado ao FontAwesomeIcon
  style?: StyleProp<...>;
}

export function Icon(props: IconProps): JSX.Element;
```

### Uso

```tsx
<Icon name="location-dot" color={colors.primary} size={16} />
<Icon name="star" variant="solid" color={colors.accent} size={14} />
<Icon name="heart" variant="regular" color={colors.foreground} size={18} />
<Icon name="apple" color={colors.foreground} size={16} />   // brands resolvido internamente
<Icon name="google" size={20} />                            // brands resolvido internamente
```

### Mecânica interna

- Um **mapa central** `ICON_MAP: Record<IconName, { solid?: IconDefinition; regular?: IconDefinition; brands?: IconDefinition }>` populado com deep imports.
- `Icon` seleciona a definição pela `variant` (default `solid`); se a variant pedida não existir para aquele nome, faz fallback determinístico (brands → brands; senão solid; senão regular) — sem lançar em runtime, mas o teste de unidade garante que toda variant usada na base existe.
- Repassa `color`, `size`, `style` ao `FontAwesomeIcon`.
- Apple/Google têm apenas a entrada `brands`; `Icon` resolve para brands automaticamente quando é a única definição.

## Mapeamento completo (25 ícones, todos free — confirmado no metadata FA 7.x)

| Lucide | `name` (API) | Pacote(s) FA | Export | Variant default no projeto |
|---|---|---|---|---|
| Apple | `apple` | brands | `faApple` | brands |
| ArrowLeft | `arrow-left` | solid | `faArrowLeft` | solid |
| AtSign | `at` | solid | `faAt` | solid |
| Bell | `bell` | solid + regular | `faBell` | regular |
| Calendar | `calendar` | solid + regular | `faCalendar` | regular |
| Check | `check` | solid | `faCheck` | solid |
| ChevronRight | `chevron-right` | solid | `faChevronRight` | solid |
| Clock | `clock` | solid + regular | `faClock` | regular |
| Heart | `heart` | solid + regular | `faHeart` | depende do estado (cheio=solid, vazio=regular) |
| House | `house` | solid | `faHouse` | solid |
| Info | `circle-info` | solid | `faCircleInfo` | solid |
| LogOut | `right-from-bracket` | solid | `faRightFromBracket` | solid |
| Mail | `envelope` | solid + regular | `faEnvelope` | regular |
| MapPin | `location-dot` | solid | `faLocationDot` | solid |
| MessageCircle | `comment` | solid + regular | `faComment` | regular |
| Music | `music` | solid | `faMusic` | solid |
| Navigation | `location-arrow` | solid | `faLocationArrow` | solid |
| Search | `magnifying-glass` | solid | `faMagnifyingGlass` | solid |
| Share2 | `share-nodes` | solid | `faShareNodes` | solid |
| SlidersHorizontal | `sliders` | solid | `faSliders` | solid |
| Sparkles | `wand-magic-sparkles` | solid | `faWandMagicSparkles` | solid |
| Star | `star` | solid + regular | `faStar` | depende do estado (cheio=solid, vazio=regular) |
| Store | `store` | solid | `faStore` | solid |
| Ticket | `ticket` | solid | `faTicket` | solid |
| User | `user` | solid + regular | `faUser` | regular |
| X | `xmark` | solid | `faXmark` | solid |
| Google (login) | `google` | brands | `faGoogle` | brands |

> Ícones com duas variantes registram tanto `solid` quanto `regular` no mapa; o call-site escolhe a variant. Demais registram só `solid` (ou só `brands`).

## Migração arquivo a arquivo (16 arquivos)

Para cada arquivo: remover o import de `lucide-react-native`, adicionar `import { Icon } from '@/components/ui/Icon'`, trocar `<Xxx color=.. size=.. />` por `<Icon name=".." color=.. size=.. />`.

Casos com tratamento especial:

- **`src/components/ui/RatingStars.tsx`** — hoje `<Star color={colors.accent} fill={colors.accent} size={14} />` (estrela sempre cheia). Vira `<Icon name="star" variant="solid" color={colors.accent} size={14} />`. O `fill` deixa de existir (no FA o preenchimento vem da variant).
- **Favoritar (`Heart`)** em `establishment/[id].tsx`, `event/[id].tsx`, `EventCard.tsx`, `favorites.tsx`, `(tabs)/profile.tsx`, `NotificationCard.tsx` — quando o código representa "favoritado vs não", usar `variant="solid"` (cheio) / `variant="regular"` (vazio) conforme o estado já existente. Onde for ícone decorativo fixo, manter a variant que reproduz o visual atual.
- **`app/login.tsx`** — Google deixa de ser `<Text>G</Text>` e passa a `<Icon name="google" size={...} />` dentro do botão `variant="white"`; Apple `<Apple ... />` → `<Icon name="apple" ... />`; Mail → `<Icon name="envelope" ... />`; Info → `<Icon name="circle-info" ... />`.
- **`app/(tabs)/_layout.tsx`** — tab bar usa House/Heart/Bell/MapPin/User. Mapear para os `name` correspondentes preservando `color`/`size` que o layout já passa por estado (ativo/inativo).
- **`NotificationCard.tsx`** — a função helper `iconFor(type, unread)` que retorna ícones Lucide passa a retornar `IconName` (string), e o card renderiza `<Icon name={...} />`.

Os componentes `Button` e `CircleIconButton` continuam recebendo `icon?: ReactNode` — o que muda é o JSX passado a eles (`<Icon .../>` no lugar de `<Lucide .../>`). Nenhuma mudança na assinatura deles.

## Testes

`Icon.tsx` é componente (não service/util), mas o **mapa central é um contrato crítico**. Teste de unidade (`Icon.test.tsx` ou `__tests__/Icon`):

1. Para cada `IconName`, o mapa resolve ao menos uma `IconDefinition` válida (objeto FA com `iconName`/`prefix`) — evita "icon not found" em runtime.
2. `variant="solid"` e `variant="regular"` selecionam a definição do pacote correto para os ícones que têm ambas (star, heart, etc.).
3. `apple`/`google` resolvem para definição com `prefix === 'fab'`.

Regressão estrutural: o teste fixa a lista de `IconName` esperada e garante que cada uma é renderizável — qualquer remoção/erro de mapeamento quebra o teste.

## Fora de escopo

- `apps/web` (Web) — não será tocado nesta migração.
- Library global do FA (`library.add`) — descartada por matar tree-shaking.
- Suporte a `className` para cor nos ícones — mantém-se `color={}` como hoje.

## Riscos e mitigações

- **Deep import + Metro/subpath:** padrão `@fortawesome/<pacote>/<faExport>` funciona em Metro/Expo na maioria dos casos; se houver erro de resolução de subpath, fallback é o named import (`import { faStar } from '@fortawesome/free-solid-svg-icons'`) — isolado no `Icon.tsx`, sem impacto nos call-sites.
- **Diferença visual Sparkles:** `faWandMagicSparkles` tem a varinha; aceito pelo usuário.
- **Bundle size:** mitigado por deep imports; só ~26 ícones importados individualmente.
- **Brand/trademark (Apple/Google login):** a licença FA cobre o SVG, não a marca; seguir HIG/diretrizes de cada plataforma para botões de login social.
