import Link from "next/link"
import { Button } from "~/components/ui/button"
import { auth } from "~/server/auth";

export default async function Header() {
  const session = await auth();
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          Espaço Pessoal
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="#features" className="text-gray-600 hover:text-primary">
            Recursos
          </Link>
          <Link href="#testimonials" className="text-gray-600 hover:text-primary">
            Testimonials
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-primary">
            Pricing
          </Link>
        </nav>
        <Button>
        <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
        </Button>
      </div>
    </header>
  )
}

