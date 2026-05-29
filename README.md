# Agenda de Boteco - Mobile

Projeto React Native inicializado com Expo, seguindo as melhores práticas de performance e escalabilidade.

## Tecnologias e Decisões Técnicas

- **Expo (SDK 56)**: Plataforma robusta para desenvolvimento cross-platform.
- **Web Support**: Configurado para rodar no navegador usando `react-native-web`.
- **Navigation**: `expo-router` (File-based routing) para uma experiência de navegação nativa e web-friendly.
- **Performance de Listas**: `@shopify/flash-list` utilizado para renderização eficiente de listas longas (CRITICAL).
- **State Management**: `Zustand` para estado atômico e re-renders otimizados (HIGH).
- **Native Navigation**: `react-native-screens` integrado para performance superior em dispositivos móveis.
- **Safe Area**: `react-native-safe-area-context` para garantir que o conteúdo não seja sobreposto por notches ou barras do sistema.
- **TypeScript**: Configurado para garantir segurança de tipos (MANDATORY).

## Estrutura de Pastas

- `app/`: Diretório de rotas do `expo-router`.
- `src/`: Lógica compartilhada.
  - `components/`: Componentes reutilizáveis.
  - `hooks/`: Custom hooks.
  - `store/`: Gerenciamento de estado (Zustand).
  - `theme/`: Tokens de design e estilos globais.
  - `constants/`: Valores constantes e configurações.

## Como Rodar

1. Certifique-se de ter o `pnpm` instalado.
2. Instale as dependências: `pnpm install`
3. Inicie o projeto:
   - Web: `pnpm web`
   - iOS: `pnpm ios`
   - Android: `pnpm android`
   - Metro: `pnpm start`
