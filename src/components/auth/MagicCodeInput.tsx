import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Mail, ArrowLeft } from "lucide-react";

interface MagicCodeInputProps {
  email: string;
  code: string;
  setCode: (code: string) => void;
  isLoading: boolean;
  csrfToken: string | undefined;
  handleVerifyCode: (e: React.FormEvent) => Promise<void>;
  setCodeSent: (sent: boolean) => void;
}

export function MagicCodeInput({
  email,
  code,
  setCode,
  isLoading,
  csrfToken,
  handleVerifyCode,
  setCodeSent,
}: MagicCodeInputProps) {
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 6 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div className="w-full max-w-md">
      {/* Subtle top accent line */}
      <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Digite seu código
          </CardTitle>
          <CardDescription>
            Enviamos um código de 6 dígitos para <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificação</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                required
                className="text-center text-2xl font-mono tracking-widest transition-all duration-300 focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
              disabled={isLoading || code.length !== 6 || !csrfToken}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Verificando...
                </div>
              ) : (
                "Verificar código"
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-600">
            O código expira em 10 minutos.
          </p>
          {!csrfToken && (
            <p className="text-center text-sm text-amber-600">
              Carregando dados de segurança...
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setCodeSent(false)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}