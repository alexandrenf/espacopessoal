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
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 py-24 text-white">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Gentle floating orbs */}
      <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-white/10 blur-3xl" />
      <div
        className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-white/5 blur-3xl"
        style={{ animationDelay: "2s" }}
      />

      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="mx-auto max-w-4xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Comece gratuitamente
              </div>
            </motion.div>

            <motion.h2
              className="mb-6 text-5xl font-bold leading-tight md:text-6xl"
              variants={itemVariants}
            >
              Pronto para começar?
            </motion.h2>

            <motion.p
              className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-blue-100 md:text-2xl"
              variants={itemVariants}
            >
              Crie sua conta gratuita hoje e comece a organizar sua vida digital
              de forma eficiente.
            </motion.p>

            <motion.div
              className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
              variants={itemVariants}
            >
              <Link href="/auth/signin" className="group">
                <Button className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-700 shadow-lg transition-all duration-300 hover:bg-blue-50 hover:shadow-xl group-hover:scale-105">
                  Começar Agora
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link
                href="#recursos"
                className="px-6 py-3 text-lg font-medium text-white/80 transition-colors hover:text-white"
              >
                Conhecer recursos
              </Link>
            </motion.div>

            {/* Trust indicators with improved accessibility */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-8 text-sm text-blue-100"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 text-green-400"
                  aria-hidden="true"
                />
                <span>
                  <span className="sr-only">Verificado: </span>100% Gratuito
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 text-blue-300"
                  aria-hidden="true"
                />
                <span>
                  <span className="sr-only">Verificado: </span>Sem cartão
                  necessário
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 text-purple-300"
                  aria-hidden="true"
                />
                <span>
                  <span className="sr-only">Verificado: </span>Pronto em 1
                  minuto
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
