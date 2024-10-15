"use client"

import { createRedirectPage } from "@/actions/page_actions";
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";

export default function CreateRedirectPageForm() {
    const initialState = {
        message: "",
        error: {}
    };
    const [state, formAction] = useActionState(createRedirectPage, initialState);

    return (
        <form action={formAction}>
            <div className="form-group">
                <label htmlFor='shortcode'>Shortcode</label>
                <input type='text' name='shortcode' id='shortcode' className={state.error?.shortcode ? "border-red-400" : ""} />
                <p className="form-label-error">{state.error?.shortcode}</p>
            </div>
            <div className="form-group">
                <label htmlFor='dest'>Destination URL</label>
                <input type='text' name='dest' id='dest' className={state.error?.dest ? "border-red-400" : ""} />
                <p className="form-label-error">{state.error?.dest}</p>
            </div>
            <p>{state.message}</p>
            <SubmitButton />
        </form>
    );
}