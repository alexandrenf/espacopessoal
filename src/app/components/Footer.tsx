import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-lg font-semibold text-transparent">
              Espaço Pessoal
            </h3>
            <p className="text-sm text-muted-foreground">
              Organize suas notas, pensamentos e ideias em um único lugar
              seguro.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-lg font-semibold">Produto</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#recursos"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Recursos
                </Link>
              </li>
              <li>
                <Link
                  href="/notas"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Bloco de Notas
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Perfil
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-lg font-semibold">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-lg font-semibold">Contato</h4>
            <div className="flex space-x-4">
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link
                href="mailto:contato@espacopessoal.com"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Espaço Pessoal. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
