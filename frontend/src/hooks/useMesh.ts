import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, MeshState, Role } from '../types';

async function readState(response: Response): Promise<MeshState> {
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Сервер недоступен');
    }
    return response.json();
}

export function useMesh(role: Role) {
    const latest = useRef<MeshState | null>(null);
    const sending = useRef(false);
    const [state, setState] = useState<MeshState | null>(null);
    const [offset, setOffset] = useState(0);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const receive = useCallback((next: MeshState) => {
        const previous = latest.current;
        if (previous && (next.version < previous.version || next.serverNow < previous.serverNow)) return;

        latest.current = next;
        setOffset(next.serverNow - Date.now());
        if (!previous || next.version !== previous.version || next.day !== previous.day) setState(next);
    }, []);

    const refresh = useCallback(async (signal?: AbortSignal) => {
        const response = await fetch('/api/state', { signal, cache: 'no-store' });
        receive(await readState(response));
    }, [receive]);

    useEffect(() => {
        const controller = new AbortController();
        let polling = false;

        const poll = async () => {
            if (sending.current || polling || document.hidden) return;
            polling = true;
            try {
                await refresh(controller.signal);
            } catch {
                if (!controller.signal.aborted && !latest.current) setMessage('Сервер недоступен');
            } finally {
                polling = false;
            }
        };

        void poll();
        const timer = window.setInterval(poll, 1200);
        window.addEventListener('focus', poll);
        document.addEventListener('visibilitychange', poll);
        return () => {
            controller.abort();
            window.clearInterval(timer);
            window.removeEventListener('focus', poll);
            document.removeEventListener('visibilitychange', poll);
        };
    }, [refresh]);

    useEffect(() => {
        if (!message) return;
        const timer = window.setTimeout(() => setMessage(''), 4500);
        return () => window.clearTimeout(timer);
    }, [message]);

    async function send(action: Action) {
        if (!latest.current || sending.current) return false;
        sending.current = true;
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/' + role + '/api/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...action, version: latest.current.version }),
            });
            receive(await readState(response));
            setMessage('Готово');
            return true;
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Действие не выполнено');
            await refresh().catch(() => {});
            return false;
        } finally {
            sending.current = false;
            setBusy(false);
        }
    }

    return { state, offset, busy, send, message, notify: setMessage };
}
