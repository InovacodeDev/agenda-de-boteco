# Atualização das políticas de privacidade — finalidade de cada PII — design

Data: 2026-09-03
Status: aprovado, aguardando plano de implementação
Issue: #94 (auditoria) → esta spec é uma das 5 tarefas derivadas

## Contexto

O mapeamento de PII da auditoria #94 encontrou gaps reais nas páginas de
privacidade existentes:

- `apps/web/app/privacy/page.tsx` e `apps/admin/app/privacy/page.tsx` são
  **cópias idênticas** de texto genérico voltado ao usuário final — inclusive
  no admin, cujo público real é diferente (dono de bar/músico com acesso
  administrativo, não consumidor final).
- Ambas afirmam explicitamente **"não coletamos dados de uso para
  analytics"**, o que está desatualizado: `packages/core/src/services/analytics.ts`
  configura um adapter PostHog (`createPostHogBrowserAdapter`), mesmo que
  hoje só envie UUID opaco + metadados, nunca PII.
- `apps/web-client` (painel do dono) **não tem página de privacidade**.
- `apps/web-artists` **não tem página de privacidade**, apesar de captar
  nome, telefone/WhatsApp, Instagram, região e faixa de preço de músico via
  `MusicianForm.tsx` sem login.
- `apps/mobile/app/privacy.tsx` existe só para satisfazer o requisito de URL
  HTTPS das lojas (comentário no topo do arquivo) e cita Supabase/Google
  Maps como processadores, mas não PostHog.
- Nenhum app tem página de **Termos de Uso** — o texto "Ao continuar, você
  aceita os termos" (web e mobile, telas de login) aponta para uma rota que
  não existe.

## Escopo

Cobre só a seção de **"quais dados coletamos e para quê"** dentro das
políticas de privacidade — não é uma reescrita jurídica completa, e não
inclui um novo documento de Termos de Uso (fora do pedido original; se
necessário, é tarefa separada, já que hoje não existe em nenhum lugar do
repo e criar do zero é decisão de produto, não achado de auditoria).

Conteúdo é uma **minuta factual** baseada 1:1 no mapeamento de PII da
auditoria — não é aconselhamento jurídico formal. Ajustes de tom/termo
jurídico ficam por conta de revisão humana antes de publicar.

## 1. Conteúdo — o que cada seção passa a dizer

Baseado na tabela de mapeamento já produzida na auditoria:

| Dado | Para que é usado (texto a incluir) |
| --- | --- |
| E-mail (conta) | Autenticação sem senha (OTP/magic link); nunca compartilhado com terceiros. |
| Vínculo conta ↔ favoritos | Guardar os locais/eventos favoritados entre sessões e dispositivos. |
| Localização do dispositivo (tempo de uso) | Ordenar bares/eventos por proximidade; nunca persistida no servidor, arredondada antes de qualquer uso técnico (~110m). |
| WhatsApp/Instagram/endereço do bar | Dado comercial público do estabelecimento, exibido no catálogo para o consumidor entrar em contato. |
| Nome/telefone/região/Instagram/faixa de preço (músico, `web-artists`) | Captação de lead para contato do estabelecimento interessado em contratar; não exibido publicamente sem consentimento adicional. |
| Analytics (PostHog) | Identificador técnico opaco (não reversível a e-mail/nome) e metadados de uso, para entender quais telas funcionam; nunca e-mail, telefone ou CPF. |
| Pedido de exclusão de conta | Direito do titular (LGPD art. 18); processado em fila e removido em até 1 hora. |

Remover a frase "não coletamos dados de uso para analytics" (falsa hoje) e
substituir pela linha de PostHog acima.

## 2. Onde aplicar

| App | Ação |
| --- | --- |
| `apps/web/app/privacy/page.tsx` | Atualizar seção de dados coletados + linha de analytics. |
| `apps/admin/app/privacy/page.tsx` | Atualizar com foco no público real (dono/músico com acesso ao painel), não copiar texto do consumidor final sem revisão. |
| `apps/web-client` | Criar página nova (`app/(painel)/privacidade/page.tsx` ou rota equivalente ao padrão do app), cobrindo especificamente os dados do dono de bar e do estabelecimento. |
| `apps/web-artists` | Criar página nova (`app/privacy/page.tsx`, servida em `/artists/privacy`), cobrindo os dados de músico captados por `MusicianForm.tsx`; linkar a partir do formulário (hoje sem nenhum link de privacidade). |
| `apps/mobile/app/privacy.tsx` | Atualizar seção de dados + incluir PostHog como processador. |

Não criar página de Termos de Uso nesta rodada — apenas não referenciar um
link quebrado permanece como débito conhecido a registrar no
`AGENTS_RULES.md` (Seção 8), não a resolver aqui.

## 3. Consentimento e link

`web-artists`: adicionar link "Política de Privacidade" próximo ao botão de
envio do `MusicianForm.tsx`, já que hoje não há nenhuma menção a privacidade
nessa captação sem login.

`web-client`: linkar a nova página a partir da tela de onboarding/cadastro,
seguindo o padrão já usado em `apps/web/app/login/page.tsx`.

## 4. Testes

Conteúdo estático em JSX, sem lógica — não exige teste automatizado (regra
de teste do AGENTS_RULES.md cobre `services/`/`utils/` do core, não páginas
de conteúdo). Verificação é leitura humana antes de publicar.

## Fora de escopo

- Termos de Uso como documento novo.
- Registro formal de consentimento com timestamp/versão (já mencionado como
  requisito no AGENTS_RULES.md Seção 5, mas é mudança de fluxo de auth, não
  de conteúdo de página — tarefa separada se for perseguida).
- Tradução/i18n — repo é pt-BR único (Seção 3 do AGENTS.md).
