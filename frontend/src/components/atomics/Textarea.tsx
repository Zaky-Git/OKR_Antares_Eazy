import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
        <textarea
          ref={ref}
          className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400 resize-none disabled:bg-gray-50 ${error ? 'border-red-300' : ''} ${className}`}
          rows={3}
          {...props}
        />
        {error && <span className="text-xs text-red-500 mt-1.5 block">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
