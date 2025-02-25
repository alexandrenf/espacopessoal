import { LoadingSpinner } from '../components/LoadingSpinner';

interface AlertProps {
  error?: string | null;
  isSaving?: boolean;
}

export function Alert({ error, isSaving }: AlertProps) {
  if (!error && !isSaving) return null;
  
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg flex items-center gap-2 transition-all duration-200 ${
        error
          ? "bg-red-100 border border-red-400 text-red-700"
          : "bg-blue-50 border border-blue-200 text-blue-700"
      }`}
    >
      {isSaving && <LoadingSpinner />}
      <span className="block text-sm font-medium">
        {error ?? (isSaving ? "Saving changes..." : "")}
      </span>
    </div>
  );
}