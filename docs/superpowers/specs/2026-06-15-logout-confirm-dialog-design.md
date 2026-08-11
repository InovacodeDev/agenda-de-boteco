# Modal de confirmação de logout — Design

**Data:** 2026-06-15
**Branch:** feat/fase-3
**Escopo:** adicionar confirmação antes de executar o logout na tela de Perfil.

## Objetivo

Ao tocar em "Sair" na tela de Perfil, o app deve pedir uma confirmação
antes de encerrar a sessão, em vez de deslogar imediatamente. A confirmação
usa um diálogo customizado consistente com a identidade visual do app
(dark/neon, NativeWind), não o `Alert.alert` nativo do SO.

## Decisões de design

| Decisão | Escolha |
|---|---|
| Padrão de confirmação | Modal customizado do app (NativeWind), não `Alert.alert` |
| Apresentação | Diálogo centralizado com overlay escuro |
| Conteúdo | Título + mensagem + 2 botões (sem ícone no topo) |
| Layout dos botões | Lado a lado: `Cancelar` \| `Sair` |
| Escopo do componente | Genérico (`ConfirmDialog`), logout é o primeiro consumidor |

## Componente: `ConfirmDialog`

**Arquivo novo:** `apps/mobile/src/components/ui/ConfirmDialog.tsx`

Componente controlado (sem estado interno) — o pai controla `visible`.
Isso o torna trivial de reutilizar e previsível.

```ts
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;   // default: "Confirmar"
  cancelLabel?: string;    // default: "Cancelar"
  destructive?: boolean;   // default: false
  onConfirm: () => void;
  onCancel: () => void;
}
```

### Estrutura visual

- Base: `Modal` do React Native com `transparent`, `animationType="fade"`,
  `onRequestClose={onCancel}` (trata back de Android). Sem dependência nova.
- Overlay: `View` cobrindo a tela, fundo escuro semi-transparente, centralizado.
  Tocar no overlay aciona `onCancel` (dismiss).
- Card central: `bg-card`, `rounded-2xl`, padding, largura limitada
  (ex: `max-w` / `w-full` com margens laterais). Tocar no card NÃO fecha
  (stopPropagation via `Pressable` aninhado sem onPress de dismiss).
  - Título: `font-heading`, `text-foreground`.
  - Mensagem (opcional): `font-body`, `text-muted-foreground`.
  - Linha de botões lado a lado (`flex-row gap-3`), cada um `flex-1`:
    - `Cancelar`: `Button` variante `outline`.
    - Confirmar: `Button` variante `solid`. Quando `destructive`,
      aplica `style={{ backgroundColor: colors.destructive }}`.

### Reuso e acessibilidade

- Reusa o `Button` existente (`@/components/ui/Button`) → herda o
  `useGuardedPress` (anti duplo-clique) e os tokens de estilo do app.
- Cores via `@/theme/colors` (`colors.destructive` = `#F53D7A`).
- Overlay com `accessibilityViewIsModal` no card; botões já trazem
  `accessibilityRole="button"` e `accessibilityLabel` pelo `Button`.

## Integração na tela de Perfil

**Arquivo alterado:** `apps/mobile/app/(tabs)/profile.tsx` (componente `SignedInProfile`).

1. Estado local: `const [confirmVisible, setConfirmVisible] = useState(false)`.
2. Botão "Sair" (linhas 123-129) passa a abrir o modal:
   `onPress={() => setConfirmVisible(true)}` — não chama mais `signOut()` direto.
3. Handler de confirmação:
   ```ts
   const handleConfirmSignOut = () => {
     setConfirmVisible(false);
     signOut();
   };
   ```
4. Renderiza ao final do componente:
   ```tsx
   <ConfirmDialog
     visible={confirmVisible}
     destructive
     title="Sair da conta?"
     message="Você precisará entrar novamente para favoritar e receber avisos."
     confirmLabel="Sair"
     onCancel={() => setConfirmVisible(false)}
     onConfirm={handleConfirmSignOut}
   />
   ```

## Fluxo

1. Usuário toca em "Sair" → `confirmVisible = true` → diálogo aparece.
2. Toca em **Cancelar** (ou overlay / back Android) → `confirmVisible = false`,
   nada acontece com a sessão.
3. Toca em **Sair** → modal fecha e `signOut()` é chamado. A mudança de
   `status` no `useAuthStore` faz a navegação reagir (rotas protegidas) e a
   tela renderiza `SignedOutProfile`.

## Tratamento de erro

Mantém o comportamento atual de fire-and-forget: hoje o botão já chama
`signOut()` sem `await`/`catch`. Não introduzimos tratamento de erro novo
(feedback de falha de logout seria escopo separado). O modal fecha
imediatamente ao confirmar; a UI reage à mudança de estado do store.

## Testes

- O AGENTS.md exige testes unitários apenas para `services/` e `utils/`.
  **Esta mudança não toca nenhum service nem util** — apenas um componente de
  UI novo (`ConfirmDialog`) e a tela `profile.tsx`. O service `signOut` e o
  store permanecem inalterados, com seus contratos preservados.
- O projeto **não possui** `@testing-library/react-native` nem
  `react-test-renderer`, e o `testMatch` do Jest é `src/**/*.test.ts`
  (somente lógica, não JSX). Logo, não há infra para testar componentes
  renderizados, e o padrão do projeto é não ter teste de renderização para
  componentes em `components/ui` (ex.: só `iconMap.test.ts`, que testa um
  objeto). `ConfirmDialog` segue esse padrão — sem teste de renderização.

## Arquivos

- **Novo:** `apps/mobile/src/components/ui/ConfirmDialog.tsx`
- **Alterado:** `apps/mobile/app/(tabs)/profile.tsx`

## Fora de escopo (YAGNI)

- Bottom sheet / biblioteca de modal.
- Ícone destrutivo no topo do diálogo.
- Feedback visual de erro caso `signOut()` falhe.
- Animações além do `fade` nativo do `Modal`.
