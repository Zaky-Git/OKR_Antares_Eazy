import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, iconLeft, className = '', ...props }, ref) => {
    return (
      <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
        <div className="relative">
          {iconLeft && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{iconLeft}</span>}
          <input
            ref={ref}
            className={`w-full ${iconLeft ? 'pl-11' : 'pl-4'} pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500 mt-1.5 block">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
