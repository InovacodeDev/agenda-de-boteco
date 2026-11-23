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
| 2026-11-23 | BOTECO-1 | `pnpm audit` (antes: 2 críticas, 14 altas, 17 moderadas, 6 baixas; depois: 0 críticas, 3 altas, 3 moderadas, 0 baixas — Next.js `^16.4.6`, overrides `node-forge` e `image-size`; restantes sem correção compatível: `zod` só corrige na v4, `decode-uri-component` 0.5 é ESM e quebra `query-string@7` do `expo-router`, `glob`/`minimatch` exigem major em tooling de dev), N+1 e paginação (sem N+1; docblocks de limite em `listMusicStyles`/`listCities`/`listModerationTerms`; teto de favoritos em BOTECO-17), mapa de PII × políticas (push, login Google/Apple, registro de falhas e OTA declarados; `landing` usa PostHog sem página de privacidade), rate limit × cooldowns (`email_sent = 2` = `OTP_ATTEMPTS_PER_HOUR`) |
| 2026-10-13 | #108 | `pnpm audit` (antes: 4 críticas, 10 altas, 6 moderadas, 3 baixas; depois: 0 críticas, 4 altas, 2 moderadas, 0 baixas — restantes sem correção compatível publicada), N+1 e paginação, mapa de PII × políticas de privacidade, rate limit × cooldowns de UI |
| 2026-09-03 | #94 | Performance e N+1, dependências e CVEs, mapa de PII (LGPD), rate limiting |
