import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import logo from './assets/logo.png'

// Ensure favicon works in production (Vite processes imported assets)
function setFavicon(href: string) {
  const ensureLink = (rel: string) => {
    let l = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!l) {
      l = document.createElement('link');
      l.rel = rel;
      document.head.appendChild(l);
    }
    l.type = 'image/png';
    l.href = href + `?v=${Date.now()}`; // cache-bust favicon, browsers cache aggressively
  };
  ensureLink('icon');
  ensureLink('shortcut icon');
  // iOS homescreen icon
  let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.href = href + `?v=${Date.now()}`;
}
// Prefer custom icon.png, else any icon.*, else fall back to logo.png
const iconMatches = import.meta.glob('./assets/icon.*', { eager: true, as: 'url' }) as Record<string, string>
const iconPng = iconMatches['./assets/icon.png']
const iconUrl = iconPng ?? Object.values(iconMatches)[0] ?? logo
setFavicon(iconUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
