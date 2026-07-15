# Agenda de Boteco — Mobile

App Expo (SDK 56) com expo-router, NativeWind v5 (Tailwind v4) e dados mockados
fiéis ao protótipo (vibe-noite.lovable.app).

## Rodando

```bash
pnpm install
pnpm --filter mobile dev        # Expo Go / web
```

## Mapa (Google Maps)

A aba Mapa usa `react-native-maps` com `PROVIDER_GOOGLE` + `expo-location` e
**não funciona no Expo Go** — requer dev build:

```bash
# 1. configure as keys (Google Cloud Console → Maps SDK for iOS/Android)
cp .env.example .env            # preencha GOOGLE_MAPS_API_KEY_IOS / _ANDROID

# 2. gere o build nativo (CNG — pastas ios/ e android/ ficam fora do git)
pnpm --filter mobile exec expo run:ios
pnpm --filter mobile exec expo run:android
```

Sem keys o app degrada sem crashar: iOS cai para Apple Maps (`PROVIDER_DEFAULT`)
e Android mostra a lista de bares com aviso de configuração. No web a aba mostra
uma lista (react-native-maps não suporta web).

## Estrutura

- `app/` — rotas expo-router: `(tabs)` (Feed, Mapa, Favoritos, Avisos, Perfil),
  `event/[id]`, `establishment/[id]`, `filters` (formSheet), `city`,
  `login`, `onboarding` (gate de primeiro launch via `Stack.Protected`)
- `src/theme/` — espelho TS dos tokens do `src/global.css` (`@theme`) para
  props fora do className (ícones, gradientes, mapStyle, boxShadow)
- `src/data/` — mock tipado com Zod espelhando o protótipo
- `src/services/catalog.ts` — fachada async (troca por Supabase sem mudar telas)
- `src/store/` — zustand (cidade, favoritos, filtros, notificações lidas)
- `src/utils/` — formatação/datas/geo/filtros — **unit tests obrigatórios**

## Testes

```bash
pnpm --filter mobile test
```
