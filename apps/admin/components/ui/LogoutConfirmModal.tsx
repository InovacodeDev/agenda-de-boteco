'use client';

import { Button } from '@agenda/shared-ui';

import { Modal } from './Modal';

export function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title="Sair da conta"
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Sair
          </Button>
        </div>
      }
    >
      <p className="text-[14px] text-muted-foreground">
        Você precisará entrar novamente para acessar o admin.
      </p>
    </Modal>
  );
}
