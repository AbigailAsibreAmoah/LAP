import { Component, type ReactNode } from 'react';
import { isStaleBuildError, reloadForNewVersion } from '../../utils/staleBuild';

/** Keeps one failing view from blanking the whole prototype. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; updating: boolean }> {
  state = { error: null as Error | null, updating: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // A newer version of the site was deployed while this tab was open: load it.
    if (isStaleBuildError(error) && reloadForNewVersion()) this.setState({ updating: true });
  }

  render() {
    const { error, updating } = this.state;
    if (!error) return this.props.children;
    const stale = isStaleBuildError(error);
    if (updating) {
      return (
        <div className="card stack center" style={{ maxWidth: 520, margin: '64px auto', textAlign: 'center' }} role="status">
          <h2 className="h3">Updating La Porte… / Mise à jour…</h2>
          <p className="small muted">A new version is available. Loading it now. / Une nouvelle version est disponible.</p>
        </div>
      );
    }
    return (
      <div className="card stack center" style={{ maxWidth: 520, margin: '64px auto', textAlign: 'center' }} role="alert">
        <h2 className="h3">{stale ? 'A new version is available / Nouvelle version disponible' : 'Something went wrong / Une erreur est survenue'}</h2>
        <p className="small muted">
          {stale ? 'La Porte was updated while this page was open. Reload to continue. / La Porte a été mise à jour : rechargez la page.' : error.message}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload / Recharger
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign('/');
            }}
          >
            Home / Accueil
          </button>
        </div>
      </div>
    );
  }
}
