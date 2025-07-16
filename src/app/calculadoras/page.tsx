"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, ArrowRight, Users, Clock, Shield } from "lucide-react";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

// Import the new calculator system
import {
  CALCULATOR_REGISTRY,
  type CalculatorInfo,
} from "~/lib/medical-calculators";

// Import the new enhanced modal
import { CalculatorModal } from "~/components/calculators/CalculatorModal";

// Use the new calculator registry
const calculators = CALCULATOR_REGISTRY;

export default function CalculadorasPage() {
  const [selectedCalculator, setSelectedCalculator] =
    useState<CalculatorInfo | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-24">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/10 blur-3xl" />

        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-5xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-3 text-sm font-semibold text-blue-800 shadow-lg"
            >
              <Calculator className="h-5 w-5" />
              Ferramentas Médicas Avançadas
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-6 text-5xl font-bold leading-tight text-slate-900 md:text-7xl"
            >
              Calculadoras{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Médicas
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-slate-600 md:text-2xl"
            >
              Ferramentas precisas e confiáveis para apoiar suas decisões
              clínicas. Desenvolvidas com base em diretrizes médicas atualizadas
              e validadas clinicamente.
            </motion.p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Baseado em evidências</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Validado clinicamente</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span>Resultados instantâneos</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Calculators Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              Escolha sua Calculadora
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Selecione a ferramenta adequada para sua necessidade clínica
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {calculators.map((calculator, index) => (
              <motion.div
                key={calculator.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group cursor-pointer"
                onClick={() => setSelectedCalculator(calculator)}
              >
                <Card
                  className={`group relative h-full overflow-hidden border-2 ${calculator.borderColor} ${calculator.bgColor} transition-all duration-500 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 hover:shadow-2xl hover:shadow-blue-200/50`}
                >
                  <CardHeader className="relative z-10 pb-4">
                    <div className="mb-4 flex items-start justify-between">
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        className={`relative rounded-2xl bg-gradient-to-br ${calculator.color} p-4 text-white shadow-xl transition-all duration-300 group-hover:shadow-2xl`}
                      >
                        {calculator.icon}
                        <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      </motion.div>
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant="secondary"
                          className="border-slate-200 bg-white/80 text-xs font-medium text-slate-700 shadow-sm"
                        >
                          {calculator.category}
                        </Badge>
                        <Badge
                          variant={
                            calculator.popularity === "Muito Popular"
                              ? "default"
                              : "outline"
                          }
                          className={`text-xs transition-all duration-300 ${
                            calculator.popularity === "Muito Popular"
                              ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                              : "border-slate-300 bg-white/50 text-slate-600"
                          }`}
                        >
                          {calculator.popularity}
                        </Badge>
                      </div>
                    </div>

                    <CardTitle className="mb-3 text-2xl font-bold text-slate-900 transition-colors duration-300 group-hover:text-blue-600">
                      {calculator.title}
                    </CardTitle>

                    <CardDescription className="line-clamp-3 text-base leading-relaxed text-slate-600 transition-colors duration-300 group-hover:text-slate-700">
                      {calculator.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="relative z-10 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1.5 transition-colors duration-300 group-hover:bg-blue-100/80">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            {calculator.estimatedTime}
                          </span>
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-200 bg-white/80 shadow-md transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 hover:text-white hover:shadow-lg group-hover:border-blue-300 group-hover:shadow-xl"
                        >
                          <span className="font-medium">Calcular</span>
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </motion.div>
                    </div>

                    {/* Decorative gradient overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Calculator Modal */}
      <CalculatorModal
        calculator={selectedCalculator}
        isOpen={!!selectedCalculator}
        onClose={() => setSelectedCalculator(null)}
      />

      <Footer />
    </div>
  );
}
