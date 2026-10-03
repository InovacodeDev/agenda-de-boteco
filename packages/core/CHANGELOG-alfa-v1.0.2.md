# Changelog 1.0.2 (alfa)

- Base para o painel do dono acompanhar visualizações e cliques dos bares e eventos
- Painel do dono passa a poder consultar métricas e contagem de favoritos por evento
- Registro de visualização de bar/evento agora evita duplicidade em acessos repetidos na mesma sessão
- Links de evento e estabelecimento compartilhados agora usam `/events` e `/establishments`
- Listagens do catálogo passam a carregar por páginas, permitindo rolagem contínua sem travar com muitos itens
- Índices novos no banco aceleram a busca de eventos por estabelecimento
- Corrige carregamento de mais itens ao rolar listas com filtro ativo e nomes de bar com pontuação
- Consultas do painel do dono (bar, eventos, métricas e leads de músicos) passam a ser compartilhadas entre web e mobile
- Máscara de moeda aprimorada para campos de valor em reais
- Eventos e estabelecimentos passam a ter um identificador opaco para uso em links e analytics, sem expor o id interno
- Desconexão de outros dispositivos, detecção do método de login e atualização em tempo real do catálogo passam a ser centralizadas no núcleo compartilhado
