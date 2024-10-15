"use client"
import { createLinkBlock } from "@/actions/block_actions"
import { useActionState } from "react";
import SubmitButton from "../SubmitButton";


export default function CreateLinkBlockForm({ customPage, shortcodes }: { customPage: string, shortcodes: string[] }) {

    const initialState = {
        message: "",
        error: {}
    };

    const [state, formAction] = useActionState(createLinkBlock, initialState);

    return (<form action={formAction}>
        <div className="form-group">
            <label htmlFor="redirectPageShortcode">Redirect Page</label>
            <select name="redirectPageShortcode" id="redirectPageShortcode" className={state.error?.redirectPageShortcode ? "border-red-400" : ""}>
                {shortcodes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="form-label-error">{state.error?.redirectPageShortcode}</p>
        </div>
        <div className="form-group">
            <label htmlFor="title">Title</label>
            <input type="text" name="title" id="title" className={state.error?.title ? "border-red-400" : ""} />
            <p className="form-label-error">{state.error?.title}</p>
        </div>
        <div className="form-group">
            <label htmlFor="order">Order</label>
            <input defaultValue={1} type="number" name="order" id="order" className={state.error?.order ? "border-red-400" : ""} />
            <p className="form-label-error">{state.error?.order}</p>
        </div>
        <input type="hidden" name="customPageUuid" value={customPage} />
        <p className="mb-2">{state.message}</p>
        <SubmitButton>add to page</SubmitButton>

    </form>
    );
}