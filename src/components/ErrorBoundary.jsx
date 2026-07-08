import { Component } from 'react';
import PixelCard from './PixelCard';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi error pada halaman ini.'
    };
  }

  componentDidCatch(error, info) {
    console.error('Application error boundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel app-error-card">
          <span className="big-icon">🛠️</span>
          <h1>Halaman bermasalah</h1>
          <p>
            Ada error yang membuat halaman ini tidak bisa ditampilkan. Coba muat ulang,
            atau kembali ke dashboard.
          </p>
          <small>{this.state.errorMessage}</small>
          <div className="hero-actions">
            <button className="pixel-button primary" type="button" onClick={this.handleReload}>
              Muat Ulang
            </button>
            <a className="pixel-button secondary" href="#/dashboard">
              Ke Dashboard
            </a>
          </div>
        </PixelCard>
      </main>
    );
  }
}
