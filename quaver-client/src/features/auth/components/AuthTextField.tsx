import type { ChangeEventHandler, ReactNode } from "react";

interface AuthTextFieldProps {
  autoComplete: string;
  icon: ReactNode;
  label: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  type: string;
  value: string;
  required?: boolean;
}

export default function AuthTextField({
  autoComplete,
  icon,
  label,
  onChange,
  placeholder,
  required,
  type,
  value,
}: AuthTextFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.24em] text-white/[0.44]">{label}</span>
      <span className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-cyan-200/[0.36] focus-within:bg-white/[0.075]">
        <span className="text-white/[0.46]">{icon}</span>
        <input
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}
