import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { NotepadSettingsForm } from "~/app/components/profile/NotepadSettingsForm";
import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import Header from "../components/Header";

export default async function ConfiguracoesPage() {
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
              Por favor, faça login para configurar seu bloco de notas.
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

  const settings = await api.userSettings.getNoteSettings();

  return (
    <HydrateClient>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="container mx-auto max-w-2xl flex-grow p-4">
          <h1 className="mb-8 text-2xl font-bold">
            Configurações do Bloco de Notas
          </h1>

          <div className="rounded-lg bg-white p-6 shadow">
            <NotepadSettingsForm
              initialSettings={{
                notePadUrl: settings?.notePadUrl ?? "",
                privateOrPublicUrl: settings?.privateOrPublicUrl ?? true,
                password: settings?.password ?? "",
              }}
            />
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
