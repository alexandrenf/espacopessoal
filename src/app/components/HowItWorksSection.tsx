export default function HowItWorksSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-900">Como Funciona</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comece a usar seu espaço pessoal em apenas três passos simples
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <StepCard 
            number={1}
            color="blue"
            title="Crie sua conta"
            description="Registre-se gratuitamente em menos de um minuto com seu email ou conta social."
            showConnector={true}
          />
          
          <StepCard 
            number={2}
            color="indigo"
            title="Configure seu espaço"
            description="Personalize seu URL, defina opções de privacidade e escolha uma senha se desejar."
            showConnector={true}
          />
          
          <StepCard 
            number={3}
            color="purple"
            title="Comece a usar"
            description="Acesse seu espaço pessoal de qualquer dispositivo e mantenha suas notas organizadas."
            showConnector={false}
          />
        </div>
      </div>
    </section>
  );
}

interface StepCardProps {
  number: number;
  color: "blue" | "indigo" | "purple";
  title: string;
  description: string;
  showConnector: boolean;
}

function StepCard({ number, color, title, description, showConnector }: StepCardProps) {
  const colorClass = {
    blue: "bg-blue-600",
    indigo: "bg-indigo-600",
    purple: "bg-purple-600"
  }[color];

  return (
    <div className="text-center relative">
      <div className={`w-20 h-20 ${colorClass} rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg`}>
        {number}
      </div>
      {showConnector && (
        <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-blue-200 -z-10 transform -translate-x-10"></div>
      )}
      <h3 className="text-2xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600">
        {description}
      </p>
    </div>
  );
}