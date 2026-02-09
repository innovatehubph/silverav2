'use client';

import React from 'react';

// Button Component
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}) {
  const baseStyles =
    'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline:
      'border border-slate-300 text-slate-900 hover:bg-slate-50 focus:ring-slate-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
}

// Card Component
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
}

// Card Header
export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

// Card Content
export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

// Card Title
export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold text-slate-900 ${className}`}>{children}</h2>;
}

// Alert Component
export function Alert({
  children,
  type = 'info',
}: {
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`border rounded-lg px-4 py-3 ${styles[type]}`}>
      {children}
    </div>
  );
}

// Input Component
export function Input({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <input
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

// Select Component
export function Select({
  label,
  options,
  error,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options?: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <select
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        {...props}
      >
        <option value="">Select an option</option>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

// Textarea Component
export function Textarea({
  label,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <textarea
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

// Table Component
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">{children}</table>
    </div>
  );
}

// Table Head
export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200">{children}</tr>
    </thead>
  );
}

// Table Body
export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

// Table Header Cell
export function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-4 font-medium text-slate-700 bg-slate-50">
      {children}
    </th>
  );
}

// Table Row
export function TableRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      className={`border-b border-slate-100 ${onClick ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// Table Cell
export function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-3 px-4 text-slate-700 ${className}`}>{children}</td>;
}

// Badge Component
export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const styles = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${styles[variant as keyof typeof styles]}`}>
      {children}
    </span>
  );
}

// Loading Skeleton
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-200 animate-pulse rounded ${className}`} />;
}

// Page Header
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-600 mt-2">{description}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

// Empty State
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-slate-600 mb-4">{description}</p>}
      {children}
    </div>
  );
}

// Loading Spinner
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
    </div>
  );
}

// Modal Component
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </>
  );
}
