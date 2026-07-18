import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './backend' // initialize backend client (no-op when unconfigured)
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
