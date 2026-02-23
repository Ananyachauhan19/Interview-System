import { createRoot } from 'react-dom/client'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import App from './App.jsx'

// Hide global loader once React is ready
function hideGlobalLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
}

// Remove loader immediately when React mounts (don't add artificial delay)
hideGlobalLoader();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
