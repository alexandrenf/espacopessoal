"use client";

import { motion } from "framer-motion";
import { Edit3, Shield, Palette, Calculator } from "lucide-react";
import Link from "next/link";

export default function FeaturesSection() {
  return (
    <section
      id="recursos"
      className="relative overflow-hidden py-24"
      style={{
        background:
          "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)",
      }}
    >
      {/* Subtle animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute left-10 top-20 h-72 w-72 animate-pulse rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-10 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-indigo-400 to-pink-500 opacity-80 blur-3xl [animation-delay:2s]" />
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
            <span className="inline-block rounded-full border border-blue-200/50 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 text-sm font-medium text-blue-700">
              Recursos
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
              Tudo que você precisa
            </span>
          </motion.h2>

          <motion.p
            className="mx-auto max-w-2xl text-xl text-slate-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Ferramentas simples e poderosas para organizar sua vida digital
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <FeatureCard
            icon={<Edit3 className="h-6 w-6" aria-hidden="true" />}
            title="Notas Inteligentes"
            description="Crie e organize suas notas com editor rico, tags e busca avançada. Acesse de qualquer dispositivo."
            index={0}
            color="blue"
          />

          <FeatureCard
            icon={<Shield className="h-6 w-6" aria-hidden="true" />}
            title="Privacidade Total"
            description="Seus dados são seus. Controle total sobre privacidade com opções de notas públicas ou privadas."
            index={1}
            color="indigo"
          />

          <FeatureCard
            icon={<Palette className="h-6 w-6" aria-hidden="true" />}
            title="Personalização"
            description="Adapte o espaço ao seu estilo. Temas, organização e configurações que fazem sentido para você."
            index={2}
            color="purple"
          />

          <Link href="/calculadoras" className="group">
            <FeatureCard
              icon={<Calculator className="h-6 w-6" aria-hidden="true" />}
              title="Calculadoras Médicas"
              description="Ferramentas precisas para cálculos clínicos. IMC, pressão arterial, risco cardiovascular e mais."
              index={3}
              color="green"
              isClickable={true}
            />
          </Link>
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
  color: "blue" | "indigo" | "purple" | "green";
  isClickable?: boolean;
}

function FeatureCard({
  icon,
  title,
  description,
  index,
  color,
  isClickable = false,
}: FeatureCardProps) {
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
    },
    green: {
      gradient: "from-green-500 to-green-600",
      hoverGradient: "from-green-600 to-green-700",
      bg: "bg-green-100",
      hoverBg: "group-hover:bg-green-600",
      text: "text-green-600",
      hoverText: "group-hover:text-white",
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      className={`group rounded-2xl border border-white/50 bg-white/80 p-8 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl ${isClickable ? "cursor-pointer" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      aria-label={title}
    >
      <div
        className={`h-12 w-12 ${classes.bg} ${classes.hoverBg} ${classes.text} ${classes.hoverText} mb-6 flex items-center justify-center rounded-xl transition-all duration-300`}
      >
        {icon}
      </div>

      <h3 className="mb-4 text-xl font-semibold text-slate-800">{title}</h3>

      <p className="leading-relaxed text-slate-600">{description}</p>
    </motion.div>
  );
}
