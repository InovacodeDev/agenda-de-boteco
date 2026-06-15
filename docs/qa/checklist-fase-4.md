# Checklist de QA Manual — Fase 4

> Use em build de desenvolvimento (`pnpm --filter @agenda/mobile dev`) e na web (`expo start --web`).

## 1. Adaptação para telas (4.1)

- [ ] iPhone 15/16 Pro (Dynamic Island): header e tab bar não ficam sob o notch nem sob a home indicator.
- [ ] iPhone SE 3rd Gen (375px): títulos não estouram (overflow); fontes reduzidas legíveis.
- [ ] iPad / tablet: layout centralizado, fontes maiores, sem esticar demais.
- [ ] Android Pixel 8/9: tab bar respeita a navigation bar do sistema.
- [ ] Android resolução baixa (Nexus S): conteúdo legível, sem corte.
- [ ] Web 320px → 1440px (Chrome/Safari DevTools): responsivo, sem overflow horizontal.

## 2. Tratamento offline (4.2)

- [ ] Ativar modo avião: banner "Você está offline" aparece com animação.
- [ ] Reconectar: banner some suavemente.
- [ ] Feed/destaques: dados em cache continuam visíveis offline.
- [ ] Tela de evento sem cache + offline: estado de erro com "Tentar novamente"; ao reconectar e tocar, recarrega.
- [ ] Favoritar offline: coração muda na hora (optimistic). Reconectar logado: favorito persiste no servidor.
- [ ] Login após favoritar offline: favoritos locais migram para o servidor (merge), sem duplicar.
- [ ] Forçar erro de render: ErrorBoundary mostra fallback "Algo deu errado" + "Tentar novamente".

## 3. Fluxos críticos (4.3)

- [ ] Deep link `/eventos/{cidade}/{slug}` abre a tela de evento correta.
- [ ] Deep link `/bares/{cidade}/{slug}` abre o estabelecimento correto.
- [ ] Path desconhecido cai na home sem crash.
- [ ] Interrupção de rede no carregamento de imagens: placeholders se mantêm, sem tela branca.
- [ ] Concorrência: atualizar um bar no `apps/admin` → o app nativo reflete via realtime sem travar nem vazar memória (observar reabrindo a tela algumas vezes).
- [ ] Busca por proximidade: resultados ordenados por distância; coordenadas inválidas não quebram a tela.

## 4. Definition of Done

- [ ] `turbo run test` verde.
- [ ] `turbo run typecheck` sem erros.
- [ ] `pnpm lint` sem avisos.
