"use client";

import { motion } from "framer-motion";
import { Edit3, Shield, Palette } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section 
      id="recursos" 
      className="py-24 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
      }}
    >
      {/* Subtle animated background elements */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-10 bg-gradient-to-br from-blue-400 to-purple-500 blur-3xl animate-pulse"
        />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-80 bg-gradient-to-br from-indigo-400 to-pink-500 blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200/50">
              Recursos
            </span>
          </motion.div>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text">
              Tudo que você precisa
            </span>
          </motion.h2>
          
          <motion.p 
            className="text-xl text-slate-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Ferramentas simples e poderosas para organizar sua vida digital
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Edit3 className="h-6 w-6" />}
            title="Notas Inteligentes"
            description="Crie e organize suas notas com editor rico, tags e busca avançada. Acesse de qualquer dispositivo."
            index={0}
            color="blue"
          />
          
          <FeatureCard 
            icon={<Shield className="h-6 w-6" />}
            title="Privacidade Total"
            description="Seus dados são seus. Controle total sobre privacidade com opções de notas públicas ou privadas."
            index={1}
            color="indigo"
          />
          
          <FeatureCard 
            icon={<Palette className="h-6 w-6" />}
            title="Personalização"
            description="Adapte o espaço ao seu estilo. Temas, organização e configurações que fazem sentido para você."
            index={2}
            color="purple"
          />
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
  color: "blue" | "indigo" | "purple";
}

function FeatureCard({ icon, title, description, index, color }: FeatureCardProps) {
  const colorClasses = {
    blue: {
      gradient: "from-blue-500 to-blue-600",
      hoverGradient: "from-blue-600 to-blue-700",
      bg: "bg-blue-100",
      hoverBg: "group-hover:bg-blue-600",
      text: "text-blue-600",
      hoverText: "group-hover:text-white",
    },
    indigo: {
      gradient: "from-indigo-500 to-indigo-600", 
      hoverGradient: "from-indigo-600 to-indigo-700",
      bg: "bg-indigo-100",
      hoverBg: "group-hover:bg-indigo-600",
      text: "text-indigo-600",
      hoverText: "group-hover:text-white",
    },
    purple: {
      gradient: "from-purple-500 to-purple-600",
      hoverGradient: "from-purple-600 to-purple-700",
      bg: "bg-purple-100",
      hoverBg: "group-hover:bg-purple-600",
      text: "text-purple-600",
      hoverText: "group-hover:text-white",
    }
  };

  const classes = colorClasses[color];

  return (
    <motion.div 
      className="group p-8 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-xl transition-all duration-300 border border-white/50"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
    >
      <div className={`w-12 h-12 ${classes.bg} ${classes.hoverBg} ${classes.text} ${classes.hoverText} rounded-xl flex items-center justify-center mb-6 transition-all duration-300`}>
        {icon}
      </div>
      
      <h3 className="text-xl font-semibold mb-4 text-slate-800">
        {title}
      </h3>
      
      <p className="text-slate-600 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
