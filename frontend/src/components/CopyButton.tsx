import { useState } from "react";
import { copyText } from "../utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  disabled?: boolean;
}

export default function CopyButton({
  text,
  label = "📋 Copy",
  disabled = false,
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");

  const handleClick = async () => {
    if (disabled) return;
    const ok = await copyText(text);
    setState(ok ? "ok" : "err");
    setTimeout(() => setState("idle"), 1200);
  };

  return (
    <button
      type="button"
      className={`copy-btn ${state === "ok" ? "flash-ok" : state === "err" ? "flash-err" : ""}`}
      onClick={handleClick}
      aria-label={label}
      disabled={disabled}
    >
      {state === "ok" ? "✓ Copied" : state === "err" ? "✗ Failed" : label}
    </button>
  );
}
