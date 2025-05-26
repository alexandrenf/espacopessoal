"use client";

import { motion } from "framer-motion";
import { UserPlus, Settings, Rocket } from "lucide-react";

/**
 * Renders a visually engaging "How It Works" section with animated backgrounds and a three-step process.
 *
 * Displays a gradient background with animated blurred circles, a heading area with animated text, and a responsive grid of three animated step cards describing the onboarding process.
 */
export default function HowItWorksSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-15 bg-gradient-to-br from-blue-400 to-purple-500 blur-3xl animate-pulse"
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 bg-gradient-to-br from-indigo-400 to-pink-500 blur-3xl animate-pulse"
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
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200/50">
              Como funciona
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
              Três passos simples
            </span>
          </motion.h2>
          
          <motion.p 
            className="text-xl text-slate-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Comece a usar seu espaço pessoal em poucos minutos
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <StepCard 
            number={1}
            icon={<UserPlus className="w-6 h-6" />}
            title="Crie sua conta"
            description="Registre-se gratuitamente em menos de um minuto com seu email ou conta social."
            index={0}
            color="blue"
          />
          
          <StepCard 
            number={2}
            icon={<Settings className="w-6 h-6" />}
            title="Configure seu espaço"
            description="Personalize seu URL único, defina opções de privacidade e escolha suas preferências."
            index={1}
            color="indigo"
          />
          
          <StepCard 
            number={3}
            icon={<Rocket className="w-6 h-6" />}
            title="Comece a usar"
            description="Acesse seu espaço pessoal de qualquer dispositivo e mantenha suas notas organizadas."
            index={2}
            color="purple"
          />
        </div>
      </div>
    </section>
  );
}

interface StepCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
  color: "blue" | "indigo" | "purple";
}

/**
 * Renders an animated step card displaying a step number, icon, title, and description with color theming and connector line.
 *
 * @param number - The step number to display.
 * @param icon - The icon representing the step.
 * @param title - The title of the step.
 * @param description - The description of the step.
 * @param index - The zero-based index of the step, used for animation delay and connector rendering.
 * @param color - The color theme for the card ("blue", "indigo", or "purple").
 *
 * @returns A styled and animated card representing a single step in a multi-step process.
 */
function StepCard({ number, icon, title, description, index, color }: StepCardProps) {
  const colorClasses = {
    blue: {
      numberBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      iconBg: "bg-blue-100",
      iconHoverBg: "group-hover:bg-blue-600",
      iconText: "text-blue-600",
      iconHoverText: "group-hover:text-white",
    },
    indigo: {
      numberBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      iconBg: "bg-indigo-100",
      iconHoverBg: "group-hover:bg-indigo-600",
      iconText: "text-indigo-600",
      iconHoverText: "group-hover:text-white",
    },
    purple: {
      numberBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      iconBg: "bg-purple-100",
      iconHoverBg: "group-hover:bg-purple-600",
      iconText: "text-purple-600",
      iconHoverText: "group-hover:text-white",
    }
  };

  const classes = colorClasses[color];

  return (
    <motion.div 
      className="text-center group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      viewport={{ once: true }}
    >
      {/* Step number */}
      <div className="relative mb-8">
        <div className={`w-16 h-16 ${classes.numberBg} text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
          {number}
        </div>
        
        {/* Connector line */}
        {index < 2 && (
          <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 -z-10" />
        )}
      </div>

      {/* Icon */}
      <div className={`w-12 h-12 ${classes.iconBg} ${classes.iconHoverBg} ${classes.iconText} ${classes.iconHoverText} rounded-xl flex items-center justify-center mx-auto mb-6 transition-all duration-300`}>
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