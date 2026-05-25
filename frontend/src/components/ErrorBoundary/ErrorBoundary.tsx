import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props  { children: ReactNode }
interface State  { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.page}>
          <h1 className={styles.title}>💥 Une erreur inattendue s'est produite</h1>
          <p className={styles.msg}>{this.state.message}</p>
          <button
            className={styles.btn}
            type="button"
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/'; }}
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
