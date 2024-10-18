"use client"

import { deleteLinkBlock } from "@/actions/block_actions";
import { useActionState, useEffect } from "react";
import SubmitButton from "../SubmitButton";
import { handleToast } from "@/utils";
import { LinkSlashIcon } from "@heroicons/react/24/solid";

export default function DeleteLinkBlockForm({ linkBlockUuid }: { linkBlockUuid: string }) {

    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(deleteLinkBlock, initialState);

    useEffect(() => { handleToast(state); }, [state]);

    return (<form action={formAction}>
        <input type="hidden" name="uuid" id="uuid" value={linkBlockUuid} />
        <SubmitButton>
            <LinkSlashIcon className="button-icon" />
        </SubmitButton>
    </form>
    )

}