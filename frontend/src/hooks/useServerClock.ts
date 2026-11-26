import { useEffect, useState } from 'react';

export function useServerClock(offset: number) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(timer);
    }, []);
    return now + offset;
}
