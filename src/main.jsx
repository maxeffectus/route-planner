import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MapsTestPage from './MapsTestPage.jsx'
import { RoutePlanner } from './pages/RoutePlanner.jsx'
import { PageSwitcher } from './components/PageSwitcher.jsx'

function AppContainer() {
  const [currentPage, setCurrentPage] = useState('gemini');

  const renderPage = () => {
    switch (currentPage) {
      case 'gemini':
        return <App />;
      case 'maps':
        return <MapsTestPage />;
      case 'app':
        return <RoutePlanner />;
      default:
        return <App />;
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