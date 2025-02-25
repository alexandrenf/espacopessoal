export default function FeaturesSection() {
  return (
    <section id="recursos" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-900">Recursos Principais</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tudo o que você precisa para organizar suas ideias e aumentar sua produtividade
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard 
            color="blue"
            icon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                role="img"
                aria-label="Bloco de Notas Pessoal"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
            title="Bloco de Notas Pessoal"
            description="Crie e organize suas notas em um espaço privado e seguro, acessível de qualquer dispositivo."
          />
          
          <FeatureCard 
            color="indigo"
            icon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                role="img"
                aria-label="Privacidade Garantida"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            title="Privacidade Garantida"
            description="Escolha entre notas públicas ou privadas com proteção por senha para seus conteúdos mais sensíveis."
          />
          
          <FeatureCard 
            color="purple"
            icon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                role="img"
                aria-label="Personalização Total"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title="Personalização Total"
            description="Configure seu espaço pessoal de acordo com suas preferências e necessidades específicas."
          />
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  color: "blue" | "indigo" | "purple";
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ color, icon, title, description }: FeatureCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      iconBg: "bg-blue-600",
      iconHover: "group-hover:bg-blue-700"
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      iconBg: "bg-indigo-600",
      iconHover: "group-hover:bg-indigo-700"
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-100",
      iconBg: "bg-purple-600",
      iconHover: "group-hover:bg-purple-700"
    }
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border ${classes.border} group`}>
      <div className={`w-16 h-16 ${classes.iconBg} rounded-2xl flex items-center justify-center mb-6 ${classes.iconHover} transition-colors`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
