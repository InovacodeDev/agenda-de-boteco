'use client';

export function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="border-border bg-card shadow-[var(--shadow-card)] w-full max-w-sm rounded-2xl border p-6">
        <h2 className="font-heading text-foreground text-[18px] font-600">Sair da conta</h2>
        <p className="text-muted-foreground mt-2 text-[14px]">
          Você precisará entrar novamente para acessar o painel.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-foreground hover:bg-surface-elevated rounded-lg px-4 py-2 text-[14px] font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-[14px] font-semibold transition-opacity hover:opacity-90"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
