import Header from "../components/Header"
import { Button } from "~/components/ui/button"
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import Link from "next/link";
import Footer from "../components/Footer";
import Image from "next/image";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    const userHealth = (await api.userUpdate.checkUserHealth()).isHealthy;
    
    if (!userHealth) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Atualização de Perfil Necessária</h2>
            <p className="text-gray-600 mb-6">
              Por favor, complete as informações do seu perfil para acessar todos os recursos.
            </p>
            <Link
              href="/profile"
              className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Atualizar Perfil
            </Link>
          </div>
        </div>
      );
    }
  }
  
  return (
    <HydrateClient>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main>
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10"></div>
            <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20"></div>
            <div className="absolute -top-48 -left-48 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl opacity-20"></div>
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Seu Espaço Pessoal <span className="text-blue-200">Digital</span>
              </h1>
              <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-blue-100">
                Organize suas notas, pensamentos e ideias em um único lugar seguro e acessível de qualquer lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <Link href={session ? "/profile" : "/api/auth/signin"}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                    {session ? "Acessar Meu Espaço" : "Começar Agora"}
                  </Button>
                </Link>
                <Link href="#recursos">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10 font-semibold px-8 py-6 text-lg rounded-full">
                    Conhecer Recursos
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="recursos" className="py-24 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 text-gray-900">Recursos Principais</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Tudo o que você precisa para organizar suas ideias e aumentar sua produtividade
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="bg-blue-50 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-blue-100 group">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Bloco de Notas Pessoal</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Crie e organize suas notas em um espaço privado e seguro, acessível de qualquer dispositivo.
                  </p>
                </div>
                
                <div className="bg-indigo-50 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-indigo-100 group">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Privacidade Garantida</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Escolha entre notas públicas ou privadas com proteção por senha para seus conteúdos mais sensíveis.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-purple-100 group">
                  <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Personalização Total</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Configure seu espaço pessoal de acordo com suas preferências e necessidades específicas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 text-gray-900">Como Funciona</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Comece a usar seu espaço pessoal em apenas três passos simples
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center relative">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">1</div>
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-blue-200 -z-10 transform -translate-x-10"></div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Crie sua conta</h3>
                  <p className="text-gray-600">
                    Registre-se gratuitamente em menos de um minuto com seu email ou conta social.
                  </p>
                </div>
                
                <div className="text-center relative">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">2</div>
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-blue-200 -z-10 transform -translate-x-10"></div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Configure seu espaço</h3>
                  <p className="text-gray-600">
                    Personalize seu URL, defina opções de privacidade e escolha uma senha se desejar.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">3</div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Comece a usar</h3>
                  <p className="text-gray-600">
                    Acesse seu espaço pessoal de qualquer dispositivo e mantenha suas notas organizadas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="py-24 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 text-gray-900">O Que Nossos Usuários Dizem</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Histórias reais de pessoas que transformaram sua organização pessoal
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                <div className="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold text-xl">M</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Marcos Silva</h4>
                      <p className="text-gray-500">Designer Gráfico</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">
                    &quot;Este espaço pessoal revolucionou minha forma de trabalhar. Consigo acessar minhas anotações de qualquer lugar e manter tudo organizado de forma simples e intuitiva.&quot;
                  </p>
                </div>
                
                <div className="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-purple-600 font-bold text-xl">C</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Carolina Mendes</h4>
                      <p className="text-gray-500">Estudante de Medicina</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">
                    &quot;Como estudante, preciso manter minhas anotações organizadas. Esta plataforma me permite acessar meu conteúdo de estudo de qualquer dispositivo, o que facilita muito minha rotina.&quot;
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
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
        </main>
        <Footer />
      </div>
    </HydrateClient>
  )
}
