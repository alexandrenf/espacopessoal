import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProfileDashboard } from "~/app/components/profile/ProfileDashboard";
import Link from "next/link";
import { NotepadSettingsForm } from "~/app/components/profile/NotepadSettingsForm";
import Header from "~/app/components/Header";
import { HydrateClient } from "~/trpc/server";
import { Suspense } from "react";
import { ProfileTour } from "~/app/components/profile/ProfileTour";

async function ProfileContent() {
  const [userData, noteSettings] = await Promise.all([
    api.userUpdate.getUserProfile(),
    api.userSettings.getNoteSettings(),
  ]);

  return (
    <>
      <div className="profile-dashboard mb-8 rounded-lg bg-white p-6 shadow">
        <ProfileDashboard user={userData} />
      </div>

      <div className="notepad-settings rounded-lg bg-white p-6 shadow">
        <h2 className="mb-6 text-xl font-semibold">
          Configurações do Bloco de Notas
        </h2>
        <NotepadSettingsForm
          initialSettings={{
            notePadUrl: noteSettings.notePadUrl,
            privateOrPublicUrl: noteSettings.privateOrPublicUrl ?? true,
            password: noteSettings.password,
          }}
        />
      </div>
    </>
  );
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-grow items-center justify-center bg-gray-100">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Acesso Negado
            </h2>
            <p className="mb-6 text-gray-600">
              Por favor, faça login para visualizar seu perfil.
            </p>
            <Link
              href="/api/auth/signin"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HydrateClient>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="container mx-auto max-w-2xl flex-grow p-4">
          <h1 className="profile-header mb-8 text-2xl font-bold">
            Painel de Perfil
          </h1>
          <Suspense
            fallback={
              <div className="animate-pulse">
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
            }
          >
            <ProfileContent />
          </Suspense>
        </div>
      </div>
      <ProfileTour />
    </HydrateClient>
  );
}
