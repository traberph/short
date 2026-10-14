import { useState } from "react";
import type { Me, PageKind, PageSummary } from "../../shared/api-types.js";
import { api, ApiRequestError, errorMessage } from "../api.js";
import { Button } from "./ui/button.js";
import { Dialog } from "./ui/dialog.js";
import { Field, Input, PrefixInput, Select } from "./ui/form.js";

const COPY: Record<PageKind, { title: string; description: string; submit: string }> = {
  redirect: {
    title: "New short link",
    description: "Redirects visitors to another URL. You can change the destination later.",
    submit: "Create link",
  },
  linkpage: {
    title: "New link page",
    description: "A page with your avatar, link buttons and text — like a link in bio.",
    submit: "Create page",
  },
};

export function CreatePageDialog({
  kind,
  me,
  open,
  onClose,
  onCreated,
  fixedNamespace,
}: {
  kind: PageKind;
  me: Me;
  open: boolean;
  onClose: () => void;
  onCreated: (page: PageSummary) => void;
  /** Create in this namespace without offering a choice, e.g. when an admin manages another user. */
  fixedNamespace?: string;
}) {
  const [namespace, setNamespace] = useState(fixedNamespace ?? me.username);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const close = () => {
    setCode("");
    setValue("");
    setErrors({});
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const page = await api<PageSummary>("POST", "/pages", {
        kind,
        namespace,
        ...(code.trim() && { code: code.trim() }),
        ...(kind === "redirect" ? { dest: value.trim() } : { title: value.trim() }),
      });
      close();
      onCreated(page);
    } catch (err) {
      const issues = err instanceof ApiRequestError ? err.issues : undefined;
      setErrors(
        issues
          ? Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.join(", ")]))
          : { form: errorMessage(err) },
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[kind];
  const prefix = namespace ? `/${namespace}/` : "/";

  return (
    <Dialog
      open={open}
      onClose={close}
      title={copy.title}
      description={copy.description}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {copy.submit}
          </Button>
        </>
      }
    >
      {kind === "redirect" ? (
        <Field label="Destination URL" error={errors.dest}>
          {(id) => (
            <Input id={id} type="url" required autoFocus placeholder="https://example.com/very/long/url" value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </Field>
      ) : (
        <Field label="Title" error={errors.title}>
          {(id) => <Input id={id} required autoFocus placeholder="Jane Doe" value={value} onChange={(e) => setValue(e.target.value)} />}
        </Field>
      )}

      {me.isAdmin && fixedNamespace === undefined && (
        <Field label="Namespace" error={errors.namespace}>
          {(id) => (
            <Select id={id} value={namespace} onChange={(e) => setNamespace(e.target.value)}>
              <option value={me.username}>/{me.username}/ (yours)</option>
              <option value="">Root /</option>
            </Select>
          )}
        </Field>
      )}

      <Field label="Shortcode" hint="Optional. Leave empty for a random 5-character code." error={errors.code}>
        {(id) => (
          <PrefixInput
            id={id}
            prefix={prefix}
            placeholder="random"
            pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </Field>

      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
    </Dialog>
  );
}
