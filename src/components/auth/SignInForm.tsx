import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert } from "~/components/ui/alert";
import { AlertCircle, Mail } from "lucide-react";
import { SignInProviderButton } from "./SignInProviderButton";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

interface SignInFormProps {
  providers: Record<string, Provider> | null;
  email: string;
  setEmail: (email: string) => void;
  isLoading: boolean;
  error: string | null;
  mounted: boolean;
  handleEmailSignIn: (e: React.FormEvent) => Promise<void>;
  handleProviderSignIn: (providerId: string) => Promise<void>;
  handleSendCode: (e: React.FormEvent) => Promise<void>;
  getErrorMessage: (error: string) => string;
}

export function SignInForm({
  providers,
  email,
  setEmail,
  isLoading,
  error,
  mounted,
  handleEmailSignIn,
  handleProviderSignIn,
  handleSendCode,
  getErrorMessage,
}: SignInFormProps) {
  const oauthProviders = providers
    ? Object.values(providers).filter(
        (provider) =>
          provider.id !== "email" &&
          provider.id !== "nodemailer" &&
          provider.id !== "magic-numbers",
      )
    : [];

  const hasEmailProvider = Boolean(providers?.email ?? providers?.nodemailer);
  const hasMultipleProviders = providers && Object.keys(providers).length > 1;

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{getErrorMessage(error)}</div>
        </Alert>
      )}

      {/* OAuth Providers */}
      {mounted && oauthProviders.length > 0 && (
        <div className="space-y-3">
          {oauthProviders.map((provider) => (
            <SignInProviderButton
              key={provider.id}
              provider={provider}
              isLoading={isLoading}
              onClick={handleProviderSignIn}
            />
          ))}
        </div>
      )}

      {/* Divider */}
      {mounted && hasMultipleProviders && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">ou</span>
          </div>
        </div>
      )}

      {/* Email Sign In */}
      {mounted && hasEmailProvider && (
        <div className="space-y-4">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="space-y-3">
            <form onSubmit={handleEmailSignIn}>
              <Button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    Enviando...
                  </div>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar link de acesso
                  </>
                )}
              </Button>
            </form>

            <form onSubmit={handleSendCode}>
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-xl border-green-200 text-green-700 transition-all duration-300 hover:border-green-300 hover:bg-green-50"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-r-transparent" />
                    Enviando...
                  </div>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar código de acesso
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Back to home */}
      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-slate-600 transition-colors duration-300 hover:text-slate-900"
        >
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}
