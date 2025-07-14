import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import EmailProvider from "next-auth/providers/nodemailer";
import GoogleProvider from "next-auth/providers/google";

import { ConvexAdapter } from "./convex-adapter";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  providers: [
    DiscordProvider({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { createTransport } = await import("nodemailer");
        const transport = createTransport(provider.server);

        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: "Acesse sua conta - Espaço Pessoal",
          text: `Acesse sua conta no Espaço Pessoal\n\nClique no link abaixo para fazer login:\n${url}\n\nEste link expira em 24 horas.\n\nSe você não solicitou este email, pode ignorá-lo com segurança.\n\nEquipe Espaço Pessoal`,
          html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Acesse sua conta - Espaço Pessoal</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #334155;
                  margin: 0;
                  padding: 0;
                  background-color: #f8fafc;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
                  padding: 40px 30px;
                  text-align: center;
                }
                .header h1 {
                  color: #ffffff;
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
                }
                .header p {
                  color: #e2e8f0;
                  margin: 8px 0 0 0;
                  font-size: 16px;
                }
                .content {
                  padding: 40px 30px;
                }
                .content h2 {
                  color: #1e293b;
                  margin: 0 0 20px 0;
                  font-size: 24px;
                  font-weight: 600;
                }
                .content p {
                  margin: 0 0 20px 0;
                  font-size: 16px;
                  line-height: 1.6;
                }
                .button {
                  display: inline-block;
                  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
                  color: #ffffff;
                  text-decoration: none;
                  padding: 16px 32px;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 16px;
                  margin: 20px 0;
                  transition: all 0.3s ease;
                }
                .button:hover {
                  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                  transform: translateY(-1px);
                  box-shadow: 0 8px 25px -8px rgba(59, 130, 246, 0.5);
                }
                .footer {
                  background-color: #f1f5f9;
                  padding: 30px;
                  text-align: center;
                  border-top: 1px solid #e2e8f0;
                }
                .footer p {
                  margin: 0;
                  font-size: 14px;
                  color: #64748b;
                }
                .security-note {
                  background-color: #f0f9ff;
                  border: 1px solid #bae6fd;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 20px 0;
                }
                .security-note p {
                  margin: 0;
                  font-size: 14px;
                  color: #0369a1;
                }
                @media (max-width: 600px) {
                  .container {
                    margin: 0;
                    border-radius: 0;
                  }
                  .header, .content, .footer {
                    padding: 30px 20px;
                  }
                  .header h1 {
                    font-size: 24px;
                  }
                  .content h2 {
                    font-size: 20px;
                  }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Espaço Pessoal</h1>
                  <p>Seu espaço digital organizado</p>
                </div>

                <div class="content">
                  <h2>Acesse sua conta</h2>
                  <p>Olá! Recebemos uma solicitação para acessar sua conta no Espaço Pessoal.</p>
                  <p>Clique no botão abaixo para fazer login de forma segura:</p>

                  <div style="text-align: center;">
                    <a href="${url}" class="button">Acessar minha conta</a>
                  </div>

                  <div class="security-note">
                    <p><strong>🔒 Informações de segurança:</strong><br>
                    Este link expira em 24 horas e só pode ser usado uma vez. Se você não solicitou este acesso, pode ignorar este email com segurança.</p>
                  </div>

                  <p>Se o botão não funcionar, você também pode copiar e colar este link no seu navegador:</p>
                  <p style="word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 14px;">${url}</p>
                </div>

                <div class="footer">
                  <p>Este email foi enviado pelo <strong>Espaço Pessoal</strong><br>
                  Organize suas notas, pensamentos e ideias em um único lugar seguro.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log("Email sent successfully:", result);
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: ConvexAdapter(process.env.CONVEX_URL!),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;
