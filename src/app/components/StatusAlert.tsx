interface StatusAlertProps {
  error: string | null;
  isSaving: boolean;
}

const ALERT_STYLES = {
  error: "bg-red-100 border border-red-400 text-red-700",
  info: "bg-blue-100 border border-blue-400 text-blue-700",
} as const;

export const StatusAlert: React.FC<StatusAlertProps> = ({ error, isSaving }) => (
  <div
    role="alert"
    aria-live="polite"
    className={`fixed top-4 right-4 px-4 py-3 rounded shadow-md animate-in fade-in slide-in-from-top-5 duration-300 ${
      error ? ALERT_STYLES.error : ALERT_STYLES.info
    }`}
  >
    <span className="block sm:inline">
      {error ?? (isSaving ? "Saving..." : "")}
    </span>
  </div>
);
