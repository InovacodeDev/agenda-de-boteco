# Log de Auditorias

Registro das auditorias de segurança, performance, supply chain e LGPD deste
repositório. A auditoria vence em **30 dias**: passado esse prazo, o workflow
`audit-gate.yml` bloqueia merge em `alfa`, `beta` e `release` até que uma nova
seja concluída e registrada aqui.

Ao registrar uma auditoria nova, atualize **também** `.github/audit-log.json`
com a mesma data, no mesmo commit — o hook `pre-commit` recusa o commit se os
dois arquivos divergirem.

| Data | Issue | Escopo |
| --- | --- | --- |
| 2026-10-13 | #108 | `pnpm audit` (antes: 4 críticas, 10 altas, 6 moderadas, 3 baixas; depois: 0 críticas, 4 altas, 2 moderadas, 0 baixas — restantes sem correção compatível publicada), N+1 e paginação, mapa de PII × políticas de privacidade, rate limit × cooldowns de UI |
| 2026-09-03 | #94 | Performance e N+1, dependências e CVEs, mapa de PII (LGPD), rate limiting |
