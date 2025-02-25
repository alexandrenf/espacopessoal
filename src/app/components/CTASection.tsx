import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/cta-pattern.svg')] opacity-10"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl opacity-20"></div>
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-400 rounded-full filter blur-3xl opacity-20"></div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl font-bold mb-6">Pronto para Começar?</h2>
        <p className="text-xl mb-10 max-w-2xl mx-auto text-blue-100">
          Crie sua conta gratuita hoje e comece a organizar sua vida pessoal de forma eficiente.
        </p>
        <Link href="/api/auth/signin" className="inline-block bg-white text-blue-700 py-3 px-6 rounded-full hover:bg-blue-50 transition-colors">
          Começar Agora
        </Link>
      </div>
    </section>
  );
}