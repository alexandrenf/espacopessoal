import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProfileDashboard } from "~/app/components/profile/ProfileDashboard";
import Link from "next/link";
import { NotepadSettingsForm } from "~/app/components/profile/NotepadSettingsForm";
import Header from "~/app/components/Header";
import { HydrateClient } from "~/trpc/server";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Acesso Negado</h2>
            <p className="text-gray-600 mb-6">Por favor, faça login para visualizar seu perfil.</p>
            <Link
              href="/api/auth/signin"
              className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const userData = await api.userUpdate.getUserProfile();
  const noteSettings = await api.userSettings.getNoteSettings();

  return (
    <HydrateClient>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow container mx-auto max-w-2xl p-4">
          <h1 className="mb-8 text-2xl font-bold">Painel de Perfil</h1>
          
          <div className="bg-white shadow rounded-lg mb-8 p-6">
            <ProfileDashboard user={userData} />
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Configurações do Bloco de Notas</h2>
            <NotepadSettingsForm initialSettings={{
              notePadUrl: noteSettings.notePadUrl,
              privateOrPublicUrl: noteSettings.privateOrPublicUrl ?? true,
              password: noteSettings.password
            }} />
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
