import { useMesh } from '../../hooks/useMesh';
import type { Role } from '../../types';
import { Buyer } from '../Buyer/Buyer';
import { Dispatcher } from '../Dispatcher/Dispatcher';
import { Layout } from '../Layout/Layout';
import { Pvz } from '../Pvz/Pvz';
import { Seller } from '../Seller/Seller';

export function App({ role }: { role: Role }) {
    const { state, busy, offset, send, message, notify } = useMesh(role);
    const cabinet = state ? { state, busy, offset, send } : null;

    return (
        <Layout role={role} day={state?.day} message={message}>
            {cabinet ? (
                <>
                    {role === 'buyer' && <Buyer {...cabinet} />}
                    {role === 'seller' && <Seller {...cabinet} />}
                    {role === 'pvz' && <Pvz {...cabinet} />}
                    {role === 'wb' && <Dispatcher {...cabinet} notify={notify} />}
                </>
            ) : <p role="status">Загрузка кабинета…</p>}
        </Layout>
    );
}
