import { Component, type ReactNode } from 'react';

/** Keeps one failing view from blanking the whole prototype. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card stack center" style={{ maxWidth: 520, margin: '64px auto', textAlign: 'center' }}>
        <h2 className="h3">Something went wrong / Une erreur est survenue</h2>
        <p className="small muted">{this.state.error.message}</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            this.setState({ error: null });
            window.location.assign('/');
          }}
        >
          Home / Accueil
        </button>
      </div>
    );
  }
}
