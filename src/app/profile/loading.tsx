import Header from "~/app/components/Header";

export default function ProfileLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="container mx-auto max-w-2xl flex-grow p-4">
        <div className="animate-pulse">
          <div className="mb-8 h-8 w-48 rounded bg-gray-200"></div>

          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <div className="space-y-4">
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
              <div className="h-4 w-1/2 rounded bg-gray-200"></div>
              <div className="h-4 w-2/3 rounded bg-gray-200"></div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6 h-6 w-2/3 rounded bg-gray-200"></div>
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-5/6 rounded bg-gray-200"></div>
              <div className="h-4 w-4/6 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
