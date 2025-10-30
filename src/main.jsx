import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { GeminiNano } from './pages/GeminiNano.jsx'
import { MapsTest } from './pages/MapsTest.jsx'
import { RoutePlanner } from './pages/RoutePlanner.jsx'
import { Summarizer } from './pages/Summarizer.jsx'
import { PageSwitcher } from './components/PageSwitcher.jsx'

function AppContainer() {
  const isDevelopment = import.meta.env.DEV;
  const [currentPage, setCurrentPage] = useState(isDevelopment ? 'gemini' : 'app');

  const renderPage = () => {
    // In production, always show RoutePlanner
    if (!isDevelopment) {
      return <RoutePlanner />;
    }

    // In development, allow switching between pages
    switch (currentPage) {
      case 'gemini':
        return <GeminiNano />;
      case 'summarizer':
        return <Summarizer />;
      case 'maps':
        return <MapsTest />;
      case 'app':
        return <RoutePlanner />;
      default:
        return <RoutePlanner />;
    }
  };

  return (
    <>
      {isDevelopment && <PageSwitcher currentPage={currentPage} onPageChange={setCurrentPage} />}
      {renderPage()}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppContainer />
  </React.StrictMode>,
)