import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App/App';
import { roleNames } from './components/Layout/Layout';
import type { Role } from './types';

const path = window.location.pathname.split('/')[1];
const role: Role = path === 'seller' || path === 'pvz' || path === 'wb' ? path : 'buyer';
const root = document.getElementById('root');

if (!root) throw new Error('Корневой элемент приложения отсутствует');

document.title = 'Контур · ' + roleNames[role];
createRoot(root).render(
    <StrictMode>
        <App role={role} />
    </StrictMode>
);
