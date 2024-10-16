"use client"
import { pinPageToRoot } from "@/actions/page_actions";
import { BookmarkIcon } from "@heroicons/react/24/solid";
import { useActionState, useState } from "react";

export default function PinPageToRootForm({ pageUuid, disabled }: { pageUuid: string, disabled: boolean }) {

    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(pinPageToRoot, initialState);


    return ( <form action={formAction}>
        <input type="hidden" name="uuid" value={pageUuid} />
        {/* <p>{state.message}</p> */}
        <button type="submit" className="btn btn-primary" disabled={disabled}><BookmarkIcon className="h-5 w-5 inline-block align-middle"/></button>
    </form>)
}