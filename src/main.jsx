import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { GeminiNano } from './pages/GeminiNano.jsx'
import { MapsTest } from './pages/MapsTest.jsx'
import { RoutePlanner } from './pages/RoutePlanner.jsx'
import { Summarizer } from './pages/Summarizer.jsx'
import { PageSwitcher } from './components/PageSwitcher.jsx'

function AppContainer() {
  const [currentPage, setCurrentPage] = useState('gemini');

  const renderPage = () => {
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
        return <GeminiNano />;
    }
  };

  return (
    <>
      <PageSwitcher currentPage={currentPage} onPageChange={setCurrentPage} />
      {renderPage()}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppContainer />
  </React.StrictMode>,
)