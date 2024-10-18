"use client"
import { pinPageToRoot } from "@/actions/page_actions";
import { handleToast } from "@/utils";
import { BookmarkIcon, BookmarkSlashIcon } from "@heroicons/react/24/solid";
import { use, useActionState, useEffect, useState } from "react";
import { toast } from 'react-hot-toast';

export default function PinPageToRootForm({ pageUuid, pinned }: { pageUuid: string, pinned: boolean }) {

    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(pinPageToRoot, initialState);

    useEffect(() => { handleToast(state); }, [state]);

    return (<form action={formAction}>
        <input type="hidden" name="uuid" value={pageUuid} />
        <input type="hidden" name="unpin" value={"" + pinned} />
        <button type="submit" className="btn btn-primary">
            {pinned ?
                <BookmarkSlashIcon className="h-5 w-5 inline-block align-middle" />
                :
                <BookmarkIcon className="h-5 w-5 inline-block align-middle" />
            }
        </button>
    </form>)
}