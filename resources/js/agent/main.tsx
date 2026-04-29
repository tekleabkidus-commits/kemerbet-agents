import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AgentApp from '@agent/AgentApp';

const root = document.getElementById('agent-root')!;
const token = root.dataset.token!;

createRoot(root).render(
    <StrictMode>
        <AgentApp token={token} />
    </StrictMode>
);
