import type { FormEvent } from 'react';
import type { Action, SendAction } from '../types';

export function useFormAction(send: SendAction, command: (form: FormData) => Action) {
    return (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void send(command(new FormData(event.currentTarget)));
    };
}
