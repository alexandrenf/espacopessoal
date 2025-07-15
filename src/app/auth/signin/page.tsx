"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";
import { useSignInHandlers } from "~/hooks/useSignInHandlers";
import { SignInForm } from "~/components/auth/SignInForm";
import { MagicCodeInput } from "~/components/auth/MagicCodeInput";
import { EmailSentConfirmation } from "~/components/auth/EmailSentConfirmation";

export default function SignIn() {
  const {
    providers,
    email,
    setEmail,
    isLoading,
    emailSent,
    code,
    setCode,
    codeSent,
    mounted,
    csrfToken,
    error,
    handleEmailSignIn,
    handleProviderSignIn,
    handleSendCode,
    handleVerifyCode,
    setEmailSent,
    setCodeSent,
    getErrorMessage,
  } = useSignInHandlers();

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl text-transparent">
                  Carregando...
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <EmailSentConfirmation email={email} setEmailSent={setEmailSent} />
        </main>
        <Footer />
      </div>
    );
  }

  if (codeSent) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <MagicCodeInput
            email={email}
            code={code}
            setCode={setCode}
            isLoading={isLoading}
            csrfToken={csrfToken}
            handleVerifyCode={handleVerifyCode}
            setCodeSent={setCodeSent}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-grow items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Subtle top accent line */}
          <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl text-transparent">
                Entrar
              </CardTitle>
              <CardDescription>Acesse sua conta para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <SignInForm
                providers={providers}
                email={email}
                setEmail={setEmail}
                isLoading={isLoading}
                error={error}
                mounted={mounted}
                handleEmailSignIn={handleEmailSignIn}
                handleProviderSignIn={handleProviderSignIn}
                handleSendCode={handleSendCode}
                getErrorMessage={getErrorMessage}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
