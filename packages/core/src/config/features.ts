/**
 * Feature flags de entrega gradual. Cada tela bloqueada na v1 renderiza uma
 * página "Em construção" enquanto a flag estiver false. Reverter = trocar para true.
 */
export const FEATURES = {
  /** Detalhe do estabelecimento — liberado na v2 */
  establishmentDetail: true,
  /** Aba de avisos/notificações — libera na v3 */
  notifications: true,
  /** Aba de mapa — libera na v4 */
  map: true,
  /**
   * Moderação de conteúdo (triagem de termos impróprios no texto que o dono
   * escreve). Implementada e testada em utils/moderation + services/moderation,
   * desligada porque o item é opcional no orçamento da Fase 3. Ligar = trocar
   * para true; nenhuma outra mudança de código é necessária.
   */
  contentModeration: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
