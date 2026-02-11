import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-bg-hover ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-14 h-7 bg-bg-tertiary rounded-full transition-colors duration-300">
        {/* Track */}
        <div 
          className={`absolute inset-0 rounded-full transition-colors duration-300 ${
            isDark ? 'bg-bg-tertiary' : 'bg-accent-gold/20'
          }`}
        />
        
        {/* Knob */}
        <div 
          className={`absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
            isDark 
              ? 'left-0.5 bg-bg-secondary' 
              : 'left-[calc(100%-26px)] bg-accent-gold'
          }`}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-accent-gold" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-bg-primary" />
          )}
        </div>
      </div>
      
      {showLabel && (
        <span className="text-sm font-medium text-txt-secondary">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

// Compact version for mobile nav
export function ThemeToggleCompact({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors hover:bg-bg-hover ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Moon className="w-5 h-5 text-txt-secondary" />
      ) : (
        <Sun className="w-5 h-5 text-accent-gold" />
      )}
    </button>
  );
}
