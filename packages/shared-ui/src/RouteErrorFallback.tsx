import { Button } from './Button';

export function RouteErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-foreground text-xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Tivemos um problema ao carregar esta página. Tente novamente.
      </p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}
