"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";

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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm">
              <Sparkles className="w-4 h-4" />
              Comece gratuitamente
            </div>
          </motion.div>

          <motion.h2 
            className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Pronto para começar?
          </motion.h2>
          
          <motion.p 
            className="text-xl md:text-2xl mb-10 text-blue-100 leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Crie sua conta gratuita hoje e comece a organizar sua vida digital de forma eficiente.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
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

          {/* Trust indicators */}
          <motion.div
            className="flex flex-wrap justify-center items-center gap-8 text-sm text-blue-100"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>100% Gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-300 rounded-full" />
              <span>Sem cartão necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-300 rounded-full" />
              <span>Pronto em 1 minuto</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
