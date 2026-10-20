# Changelog 1.0.3 (alfa)

- Proteção contra duplo clique em botões web: `useGuardedClick` evita que o mesmo botão dispare duas ações ao toque rápido
- `useResendCooldown` controla o reenvio de código por e-mail, alinhado ao limite real do servidor (2 envios por hora)
- Busca de estabelecimentos e eventos por lista de ids, e busca de bares por nome no servidor
- Avaliações do dono paginadas, com resumo calculado no banco
- Métricas do dono agregadas no banco, sem truncar acima de 1000 registros
- Favoritos locais enviados ao servidor numa única gravação ao entrar na conta
- Consultas de favoritos e de busca deixam de ser guardadas no cache do aparelho
