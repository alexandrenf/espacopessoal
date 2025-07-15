import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";

interface EmailSentConfirmationProps {
  email: string;
  setEmailSent: (sent: boolean) => void;
}

export function EmailSentConfirmation({
  email,
  setEmailSent,
}: EmailSentConfirmationProps) {
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
            Verifique seu email
          </CardTitle>
          <CardDescription>
            Enviamos um link de acesso para <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-slate-600">
            Clique no link enviado para fazer login. O link expira em 24 horas.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEmailSent(false)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}