import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { RoutePlanner } from './pages/RoutePlanner.jsx'

function AppContainer() {
  return <RoutePlanner />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppContainer />
  </React.StrictMode>,
)