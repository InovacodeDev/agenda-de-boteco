import { logErrorToTerminal, reportException } from '@agenda/core';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from './Button';
import { Text, View } from './tw';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Captura erros de render da árvore e mostra um fallback com reset. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logErrorToTerminal(error, { method: 'ui.errorBoundary' });
    reportException(error, {
      method: 'ui.errorBoundary',
      componentStack: info.componentStack ?? undefined,
    });
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View className="bg-background flex-1 items-center justify-center gap-4 px-8">
        <Text className="font-heading text-foreground text-center text-[20px]">
          Algo deu errado
        </Text>
        <Text className="font-body text-muted-foreground text-center text-[14px]">
          Tivemos um problema ao carregar esta parte do app. Tente novamente.
        </Text>
        <Button label="Tentar novamente" onPress={this.reset} />
      </View>
    );
  }
}
