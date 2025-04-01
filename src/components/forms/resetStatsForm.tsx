"use client"

import { deletePageStats } from "@/actions/page_actions";
import { useActionState, useEffect } from "react";
import SubmitButton from "../SubmitButton";
import { handleToast } from "@/utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

export default function ResetStatsForm({ uuid }: { uuid: string }) {
    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(deletePageStats, initialState);

    useEffect(() => { handleToast(state); }, [state]);

    return (
        <form action={formAction}>
            <input type="hidden" name="uuid" value={uuid} />
            <SubmitButton><ArrowPathIcon className="button-icon" /></SubmitButton>
        </form>
    );
} 