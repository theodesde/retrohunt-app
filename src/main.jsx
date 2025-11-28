import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Import des outils Vercel
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* Tracking des visiteurs */}
    <Analytics />
    {/* Tracking de la performance (Vitesse) */}
    <SpeedInsights />
  </React.StrictMode>,
)