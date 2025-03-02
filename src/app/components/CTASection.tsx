import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
      {/* Enhanced pattern */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            radial-gradient(circle at center, rgba(255,255,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px, 16px 16px',
          backgroundPosition: '0 0, 8px 8px'
        }}
      ></div>

      {/* Animated gradient orbs */}
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 left-1/2 w-64 h-64 bg-purple-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white animate-gradient">
            Pronto para Começar?
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
            Crie sua conta gratuita hoje e comece a organizar 
            <span className="block mt-2">sua vida pessoal de forma eficiente.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              href="/api/auth/signin" 
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-8 py-4 text-lg font-bold text-blue-700 transition duration-300 ease-out hover:scale-105"
            >
              <span className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></span>
              <span className="relative group-hover:text-white transition-colors duration-300 ease-out">
                Começar Agora
              </span>
            </Link>
            <Link 
              href="#recursos" 
              className="group relative px-8 py-4 text-lg font-semibold transition-all duration-300 ease-out hover:text-white"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
              Conhecer Recursos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
