// src/components/ui/button.jsx
import React from 'react';

export default function Button({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  ...props 
}) {
  // Base classes
  let baseClass = 'inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

  // Variant styles
  const variants = {
    default: 'bg-[#468DFF] text-[#FFFFFF] border border-[#FFFFFF] hover:bg-[#0511F2] hover:border-[#0511F2] shadow-lg shadow-blue-500/15',
    secondary: 'bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF]',
    outline: 'border border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900 hover:text-slate-100',
    ghost: 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
    destructive: 'bg-red-600 text-slate-100 hover:bg-red-500',
  };

  // Size styles
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8 text-base',
    icon: 'h-10 w-10',
  };

  const selectedVariant = variants[variant] || variants.default;
  const selectedSize = sizes[size] || sizes.default;

  return (
    <button 
      className={`${baseClass} ${selectedVariant} ${selectedSize} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
