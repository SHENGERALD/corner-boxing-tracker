import { useEffect, useState, type InputHTMLAttributes } from "react";

export interface NumericDraftInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur"> {
  value?: number;
  min: number;
  max?: number;
  allowEmpty?: boolean;
  onCommit: (value: number | undefined) => void;
}

export function NumericDraftInput({ value, min, max, allowEmpty = false, onCommit, ...inputProps }: NumericDraftInputProps) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));

  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);

  const commit = () => {
    if (draft === "" && allowEmpty) return onCommit(undefined);
    const parsed = Number(draft === "" ? min : draft);
    const next = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Number.isFinite(parsed) ? parsed : min));
    setDraft(String(next));
    onCommit(next);
  };

  return <input {...inputProps} type="number" min={min} max={max} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />;
}
