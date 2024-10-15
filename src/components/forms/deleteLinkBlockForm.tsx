"use client"

import { deleteLinkBlock } from "@/actions/block_actions";
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";

export default function DeleteLinkBlockForm({linkBlockUuid}: {linkBlockUuid:string}) {

    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(deleteLinkBlock, initialState);

    return (<form action={formAction}>

        <input type="hidden" name="uuid" id="uuid" value={linkBlockUuid}/>
        <SubmitButton>unlink</SubmitButton>
    </form>
    )
    
}