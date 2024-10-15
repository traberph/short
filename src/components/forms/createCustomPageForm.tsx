"use client"
import { createCustomPage } from "@/actions/page_actions";
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";

export default function CreateCustomPageForm() {

    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(createCustomPage, initialState);

    return (
        <form action={formAction}>
            <div className="form-group">
                <label htmlFor="shortcode">Shortcode</label>
                <input type="text" name="shortcode" id="shortcode" className={state.error?.shortcode ? "border-red-400" : ""} />
                <p className="form-label-error">{state.error?.shortcode}</p>
            </div>
            <div className="form-group">
                <label htmlFor="title">Title</label>
                <input type="text" name="title" id="title" className={state.error?.title ? "border-red-400" : ""} />
                <p className="form-label-error">{state.error?.title}</p>
            </div>
            <div className="form-group">
                <label htmlFor="image">Image</label>
                <input type="file" name="image" id="image" className={state.error?.image ? "border-red-400" : ""} />
                <p className="form-label-error">{state.error?.image}</p>
            </div>
            <p>{state.message}</p>
            <SubmitButton />
        </form>
    );

}
