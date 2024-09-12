"use client"

import { deleteUrl } from "@/actions/url_actions";
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";

export default function DeleteUrlForm({url_id}: {url_id: number}) {

    const initialState = {
        message: "",
        error: {}
    };  
    const [state, formAction] = useActionState(deleteUrl, initialState);

    return (
        <form action={formAction}>
            <input type="hidden" name="url_id" value={url_id}/>
            <SubmitButton>Delete</SubmitButton>
        </form>
    );

}