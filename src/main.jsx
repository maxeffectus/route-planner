import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MapsTestPage from './MapsTestPage.jsx'
import { PageSwitcher } from './components/PageSwitcher.jsx'

function AppContainer() {
  const [currentPage, setCurrentPage] = useState('gemini');

  return (
    <>
      <PageSwitcher currentPage={currentPage} onPageChange={setCurrentPage} />
      {currentPage === 'gemini' ? <App /> : <MapsTestPage />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppContainer />
  </React.StrictMode>,
)