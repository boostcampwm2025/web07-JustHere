import type { ChangeEvent, InputHTMLAttributes } from "react";
import { MagnifyIcon, CloseIcon } from "@/components/Icons";
import { cn } from "@/utils/cn";

interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <MagnifyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        className={cn(
          "w-full h-12 pl-12 pr-12 bg-gray-bg border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-disable focus:outline-none focus:border-primary",
          className,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray hover:text-black flex items-center justify-center"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
