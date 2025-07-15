import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate magic number
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store the code in Convex
    await convex.mutation(api.magicCodes.storeMagicCode, {
      email,
      code: verificationCode,
      expiresAt,
    });

    // Send email with code
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { createTransport } = await import("nodemailer");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const transport = createTransport(process.env.EMAIL_SERVER);
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await transport.sendMail({
      to: email,
      from: process.env.EMAIL_FROM!,
      subject: "Seu código de acesso - Espaço Pessoal",
      text: `Seu código de acesso: ${verificationCode}\n\nEste código expira em 10 minutos.\n\nSe você não solicitou este código, pode ignorar este email com segurança.\n\nEquipe Espaço Pessoal`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Seu código de acesso - Espaço Pessoal</title>
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
              text-align: center;
            }
            .code {
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
              color: #ffffff;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: 8px;
              padding: 20px 40px;
              border-radius: 12px;
              margin: 20px 0;
              display: inline-block;
              font-family: monospace;
            }
            .footer {
              background-color: #f1f5f9;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .security-note {
              background-color: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Espaço Pessoal</h1>
              <p>Seu código de acesso</p>
            </div>
            
            <div class="content">
              <h2>Digite este código para acessar sua conta:</h2>
              <div class="code">${verificationCode}</div>
              
              <div class="security-note">
                <p><strong>🔒 Informações de segurança:</strong><br>
                Este código expira em 10 minutos. Se você não solicitou este código, pode ignorar este email com segurança.</p>
              </div>
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending magic code:", error);
    return NextResponse.json(
      { error: "Erro ao enviar código por email" },
      { status: 500 }
    );
  }
}
