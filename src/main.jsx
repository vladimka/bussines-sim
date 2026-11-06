import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
          /* SW не обязателен */
        });
      });
    }
  }, []);
  return null;
}

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <PwaRegister />
  </>
);
