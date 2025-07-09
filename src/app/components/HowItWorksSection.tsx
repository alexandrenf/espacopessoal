"use client";

import { motion } from "framer-motion";
import { UserPlus, Settings, Rocket } from "lucide-react";

export default function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-24">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-15 blur-3xl" />
        <div
          className="absolute bottom-1/4 right-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400 to-pink-500 opacity-10 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <span className="inline-block rounded-full border border-indigo-200/50 bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 text-sm font-medium text-indigo-700">
              Como funciona
            </span>
          </motion.div>

          <motion.h2
            className="mb-6 text-4xl font-bold md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Três passos simples
            </span>
          </motion.h2>

          <motion.p
            className="mx-auto max-w-2xl text-xl text-slate-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Comece a usar seu espaço pessoal em poucos minutos
          </motion.p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          <StepCard
            number={1}
            icon={<UserPlus className="h-6 w-6" />}
            title="Crie sua conta"
            description="Registre-se gratuitamente em menos de um minuto com seu email ou conta social."
            index={0}
            color="blue"
          />

          <StepCard
            number={2}
            icon={<Settings className="h-6 w-6" />}
            title="Configure seu espaço"
            description="Personalize seu URL único, defina opções de privacidade e escolha suas preferências."
            index={1}
            color="indigo"
          />

          <StepCard
            number={3}
            icon={<Rocket className="h-6 w-6" />}
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

function StepCard({
  number,
  icon,
  title,
  description,
  index,
  color,
}: StepCardProps) {
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
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      className="group text-center"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      viewport={{ once: true }}
    >
      {/* Step number */}
      <div className="relative mb-8">
        <div
          className={`h-16 w-16 ${classes.numberBg} mx-auto flex items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg transition-shadow duration-300 group-hover:shadow-xl`}
        >
          {number}
        </div>

        {/* Connector line */}
        {index < 2 && (
          <div className="absolute left-full top-8 -z-10 hidden h-0.5 w-full bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 md:block" />
        )}
      </div>

      {/* Icon */}
      <div
        className={`h-12 w-12 ${classes.iconBg} ${classes.iconHoverBg} ${classes.iconText} ${classes.iconHoverText} mx-auto mb-6 flex items-center justify-center rounded-xl transition-all duration-300`}
      >
        {icon}
      </div>

      <h3 className="mb-4 text-xl font-semibold text-slate-800">{title}</h3>

      <p className="leading-relaxed text-slate-600">{description}</p>
    </motion.div>
  );
}
