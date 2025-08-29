import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import logo from './assets/logo.png'

// Ensure favicon works in production (Vite processes imported assets)
function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = href;
}
// Prefer custom icon.* if present, else fall back to logo.png
const iconMatches = import.meta.glob('./assets/icon.*', { eager: true, as: 'url' }) as Record<string, string>
const iconUrl = Object.values(iconMatches)[0] ?? logo
setFavicon(iconUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
