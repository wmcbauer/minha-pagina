import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  crashed: boolean;
}

/**
 * Se a experiência 3D quebrar por qualquer motivo (driver de GPU, navegador
 * sem suporte a algum recurso WebGL, etc), cai pra versão leve em vez de
 * mostrar uma tela em branco/quebrada.
 */
export default class Experience3DBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Experiência 3D falhou, caindo para a versão leve:', error);
  }

  render() {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}
