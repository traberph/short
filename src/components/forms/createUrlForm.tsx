"use client"

import { createUrl } from "@/actions/url_actions";
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";
import { error } from "console";

export default function CreateUrlForm() {
    const initialState = {
        message: "",
        error: {}
    };
    const [state, formAction] = useActionState(createUrl, initialState);

    console.log(state);

    return (
        <form action={formAction}>
            <div className="form-group">
                <label htmlFor='original_url'>Original URL</label>
                <input type='text' name='original_url' id='original_url' className={state.error?.original_url?"border-red-400":""}/>
                <p className="form-label-error">{ state.error?.original_url }</p>
            </div>
            <div className="form-group">
                <label htmlFor='short_code'>Short Code</label>
                <input type='text' name='short_code' id='short_code' className={state.error?.short_code?"border-red-400":""}/>
                <p className="form-label-error">{ state.error?.short_code }</p>
            </div>
            <p>{state.message}</p>
            <SubmitButton/>
        </form>
    );
}