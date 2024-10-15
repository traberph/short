"use client"

import { deletePage } from "@/actions/page_actions";
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";
import { redirect } from "next/navigation";

export default function DeletePageForm({uuid}: {uuid: string}) {

    const initialState = {
        message: "",
        error: {},
    };  
    const [state, formAction] = useActionState(deletePage, initialState);

    return (
        <form action={formAction}>
            <input type="hidden" name="uuid" value={uuid}/>
            <SubmitButton>Delete</SubmitButton>
        </form>
    );

}