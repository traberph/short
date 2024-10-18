"use client"

import { deletePage } from "@/actions/page_actions";
import { useActionState, useEffect } from "react";
import SubmitButton from "../SubmitButton";
import toast from "react-hot-toast";
import { handleToast } from "@/utils";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function DeletePageForm({ uuid }: { uuid: string }) {

    const initialState = {
        message: "",
        error: {},
    };
    const [state, formAction] = useActionState(deletePage, initialState);

    useEffect(() => { handleToast(state); }, [state]);

    return (
        <form action={formAction}>
            <input type="hidden" name="uuid" value={uuid} />
            <SubmitButton><TrashIcon className="button-icon" /></SubmitButton>
        </form>
    );

}