import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './App.jsx';
import PreviewWorkspace from './PreviewWorkspace.jsx';
import './admin.css';

const isDevelopmentPreview =
  import.meta.env.DEV && window.location.pathname === '/__preview';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isDevelopmentPreview ? <PreviewWorkspace /> : <AdminApp />}
  </React.StrictMode>
);
