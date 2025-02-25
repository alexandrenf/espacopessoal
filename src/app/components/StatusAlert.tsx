interface StatusAlertProps {
  error: string | null;
  isSaving: boolean;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({ error, isSaving }) => (
  <div
    role="alert"
    aria-live="polite"
    className={`fixed top-4 right-4 px-4 py-3 rounded shadow-md ${
      error
        ? "bg-red-100 border border-red-400 text-red-700"
        : "bg-blue-100 border border-blue-400 text-blue-700"
    }`}
  >
    <span className="block sm:inline">
      {error ?? (isSaving ? "Saving..." : "")}
    </span>
  </div>
);