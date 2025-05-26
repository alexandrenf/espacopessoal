"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "~/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Gentle floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm">
                <Sparkles className="w-4 h-4" />
                Comece gratuitamente
              </div>
            </motion.div>

            <motion.h2 
              className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
              variants={itemVariants}
            >
              Pronto para começar?
            </motion.h2>
            
            <motion.p 
              className="text-xl md:text-2xl mb-10 text-blue-100 leading-relaxed max-w-3xl mx-auto"
              variants={itemVariants}
            >
              Crie sua conta gratuita hoje e comece a organizar sua vida digital de forma eficiente.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              variants={itemVariants}
            >
              <Link 
                href="/api/auth/signin" 
                className="group"
              >
                <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center gap-2">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link 
                href="#recursos" 
                className="px-6 py-3 text-lg font-medium text-white/80 hover:text-white transition-colors"
              >
                Conhecer recursos
              </Link>
            </motion.div>

            {/* Trust indicators with improved accessibility */}
            <motion.div
              className="flex flex-wrap justify-center items-center gap-8 text-sm text-blue-100"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" aria-hidden="true" />
                <span><span className="sr-only">Verificado: </span>100% Gratuito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-300" aria-hidden="true" />
                <span><span className="sr-only">Verificado: </span>Sem cartão necessário</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-300" aria-hidden="true" />
                <span><span className="sr-only">Verificado: </span>Pronto em 1 minuto</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
