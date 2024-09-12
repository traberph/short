"use client"

import { useFormStatus } from "react-dom";

export default function SubmitButton({children}: {children?: React.ReactNode}) {
    const { pending } = useFormStatus();
    return (
        <button disabled={pending} type="submit">
            {children?children:"Submit"}
        </button>
    );
}