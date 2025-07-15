import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { createTransport } from "nodemailer";
import { rateLimiter } from "../../../../lib/rate-limiter";
import { validateEmail, isDomainSuspicious } from "../../../../lib/email-validation";
import { getClientIP, isLocalIP } from "../../../../lib/get-client-ip";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    const isLocal = isLocalIP(clientIP);
    
    // Parse request body
    const { email } = await request.json() as { email: string };

    // Basic input validation
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Enhanced email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = emailValidation.normalizedEmail!;

    // Check for suspicious domains (additional security)
    if (isDomainSuspicious(normalizedEmail)) {
      return NextResponse.json(
        { error: "Domínio de email não permitido" },
        { status: 400 }
      );
    }

    // Rate limiting by IP address (skip for localhost in development)
    if (!isLocal) {
      const ipCheck = rateLimiter.checkIpLimit(clientIP);
      if (!ipCheck.allowed) {
        const resetTime = rateLimiter.getTimeUntilReset(ipCheck.resetTime!);
        const minutes = Math.ceil(resetTime / (60 * 1000));
        
        return NextResponse.json(
          { 
            error: `Muitas tentativas deste IP. Tente novamente em ${minutes} minutos.`,
            retryAfter: resetTime
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(resetTime / 1000).toString(),
              'X-RateLimit-Limit': '5',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': ipCheck.resetTime!.toString()
            }
          }
        );
      }
    }

    // Rate limiting by email
    const emailCheck = rateLimiter.checkEmailLimit(normalizedEmail);
    if (!emailCheck.allowed) {
      if (emailCheck.cooldownTime) {
        const cooldownTime = rateLimiter.getTimeUntilReset(emailCheck.cooldownTime);
        const seconds = Math.ceil(cooldownTime / 1000);
        
        return NextResponse.json(
          { 
            error: `Aguarde ${seconds} segundos antes de solicitar outro código para este email.`,
            retryAfter: cooldownTime
          },
          { status: 429 }
        );
      }
      
      if (emailCheck.resetTime) {
        const resetTime = rateLimiter.getTimeUntilReset(emailCheck.resetTime);
        const minutes = Math.ceil(resetTime / (60 * 1000));
        
        return NextResponse.json(
          { 
            error: `Limite de códigos atingido para este email. Tente novamente em ${minutes} minutos.`,
            retryAfter: resetTime
          },
          { status: 429 }
        );
      }
    }

    // Generate magic number
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store the code in Convex using normalized email
    await convex.mutation(api.magicCodes.storeMagicCode, {
      email: normalizedEmail,
      code: verificationCode,
      expiresAt,
    });

    // Send email with code
    const transport = createTransport(process.env.EMAIL_SERVER);
    
    await transport.sendMail({
      to: normalizedEmail,
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

    // Log successful request (for monitoring)
    console.log(`Magic code sent to ${normalizedEmail} from IP ${clientIP}`);
    
    return NextResponse.json({ 
      success: true,
      message: "Código enviado com sucesso. Verifique sua caixa de entrada."
    });
  } catch (error) {
    console.error("Error sending magic code:", error);
    
    // Enhanced error logging with context
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: "Erro ao enviar código por email. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
