import Link from "next/link";

interface DocumentNotFoundProps {
  title: string;
  message: string;
  actionText: string;
  actionHref: string;
}

export function DocumentNotFound({
  title,
  message,
  actionText,
  actionHref,
}: DocumentNotFoundProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-red-600">{title}</h1>
        <p className="mb-4 text-gray-600">{message}</p>
        <Link
          href={actionHref}
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {actionText}
        </Link>
      </div>
    </div>
  );
} 