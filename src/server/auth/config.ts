import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import EmailProvider from "next-auth/providers/nodemailer";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { ConvexHttpClient } from "convex/browser";
import type { TransportOptions } from "nodemailer";

import { ConvexAdapter } from "./convex-adapter";
import { api } from "../../../convex/_generated/api";
import { env } from "../../env.js";

const convex = new ConvexHttpClient(env.CONVEX_URL);

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
  session: {
    strategy: "jwt", // Use JWT for credentials providers
  },
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
        try {
          const { createTransport } = await import("nodemailer");

          // Properly type the server configuration
          const serverConfig = provider.server as string | TransportOptions;
          const transport = createTransport(serverConfig);

          await transport.sendMail({
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

          // Log success for debugging without exposing sensitive information
          if (process.env.NODE_ENV === "development") {
            console.log(
              `Email verification sent successfully to ${email.substring(0, 3)}***@${email.split("@")[1]}`,
            );
          }
        } catch (error) {
          // Log error for debugging and monitoring
          console.error("Failed to send verification email:", {
            error: error instanceof Error ? error.message : "Unknown error",
            email: email.substring(0, 3) + "***@" + email.split("@")[1], // Redact email for privacy
            timestamp: new Date().toISOString(),
          });

          // Re-throw error to be handled by NextAuth
          throw new Error(
            "Failed to send verification email. Please try again.",
          );
        }
      },
    }),
    CredentialsProvider({
      id: "magic-numbers",
      name: "Magic Numbers",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.email !== "string") {
          throw new Error("Email é obrigatório");
        }

        if (!credentials?.code || typeof credentials.code !== "string") {
          throw new Error("Código é obrigatório");
        }

        const email = credentials.email.trim().toLowerCase();
        const code = credentials.code.trim();

        try {
          // Verify the magic code using Convex
          const verificationResult = await convex.mutation(
            api.magicCodes.verifyMagicCode,
            {
              email,
              code,
            },
          );

          if (!verificationResult.success) {
            throw new Error(verificationResult.error);
          }

          // Code is valid, now check if user exists or create one
          let existingUser = await convex.query(api.users.getByEmail, {
            email,
          });

          if (!existingUser) {
            // Create new user if they don't exist
            const userId = await convex.mutation(api.users.createForAuth, {
              name: email.split("@")[0] ?? email,
              email: email,
              emailVerified: Date.now(), // Email is verified since they got the code
            });

            // Get the created user
            existingUser = await convex.query(api.users.getById, {
              id: userId,
            });
          }

          if (!existingUser) {
            throw new Error("Falha na criação ou recuperação do usuário");
          }

          // Return user object with database ID
          return {
            id: existingUser._id,
            email: existingUser.email,
            name: existingUser.name ?? email.split("@")[0] ?? email,
            emailVerified: existingUser.emailVerified
              ? new Date(existingUser.emailVerified)
              : null,
          };
        } catch (error) {
          // Re-throw with user-friendly message
          throw new Error(
            error instanceof Error
              ? error.message
              : "Erro na verificação do código",
          );
        }
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
  adapter: ConvexAdapter(env.CONVEX_URL),
  callbacks: {
    session: ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: token?.sub ?? session.user?.id,
          name: token?.name ?? session.user?.name,
          email: token?.email ?? session.user?.email,
          image: token?.picture ?? session.user?.image,
        },
      };
    },

    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      return token;
    },

    signIn: () => {
      return true; // Allow sign in
    },
  },
} satisfies NextAuthConfig;
