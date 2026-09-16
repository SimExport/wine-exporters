import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id?: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, required, help, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {children}
      {help && !error && <p className="text-xs text-muted-foreground">{help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface CheckLikeProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  type?: "checkbox" | "radio";
}

export function CheckCard({ checked, onToggle, label, type = "checkbox" }: CheckLikeProps) {
  return (
    <button
      type="button"
      role={type}
      aria-checked={checked}
      onClick={onToggle}
      className={[
        "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm text-left transition-colors",
        checked
          ? "border-primary bg-primary/5 text-foreground"
          : "border-input bg-background hover:bg-muted/50",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-4 w-4 shrink-0 items-center justify-center border",
          type === "radio" ? "rounded-full" : "rounded-[4px]",
          checked ? "border-primary bg-primary" : "border-input",
        ].join(" ")}
      >
        {checked && (
          <span
            className={
              type === "radio"
                ? "h-1.5 w-1.5 rounded-full bg-primary-foreground"
                : "h-1.5 w-2.5 rotate-[-45deg] border-b-2 border-l-2 border-primary-foreground"
            }
          />
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
