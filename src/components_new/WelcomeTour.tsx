"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { PlayCircle, X } from "lucide-react";
import { driver } from "driver.js";
import { motion, AnimatePresence } from "framer-motion";
import { tourSteps } from "./tourSteps";
import "driver.js/dist/driver.css";
import "./tour-styles.css";


interface WelcomeTourProps {
  autoStart?: boolean;
  showButton?: boolean;
  onTourComplete?: () => void;
  onTourSkip?: () => void;
  onStepChange?: (step: number) => void;
  debug?: boolean;
  theme?: 'light' | 'dark';
  showProgress?: boolean;
}

export function WelcomeTour({
  autoStart = false,
  showButton = true,
  onTourComplete,
  onTourSkip,
  onStepChange,
  debug = false,
  theme = 'light',
  showProgress: _showProgress = true,
}: WelcomeTourProps) {
  const [mounted, setMounted] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourProgress, setTourProgress] = useState(0);
  const [_isActive, _setIsActive] = useState(false);
  const [_completedSteps, setCompletedSteps] = useState(new Set<number>());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Verificar se é a primeira visita do usuário
    const tourCompleted = localStorage.getItem("espacopessoal-tour-completed");
    const tourSkipped = localStorage.getItem("espacopessoal-tour-skipped");

    if (!tourCompleted && !tourSkipped) {
      setIsFirstVisit(true);
      if (autoStart) {
        // Delay para garantir que a página carregou completamente
        setTimeout(() => {
          setShowWelcomeCard(true);
          setIsLoading(false);
        }, 1500);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [mounted, autoStart]);

  const createTourDriver = () => {
    return driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      allowKeyboardControl: true,
      disableActiveInteraction: false,
      showButtons: ["next", "previous", "close"],
      steps: tourSteps,
      nextBtnText: "Próximo",
      prevBtnText: "Anterior",
      doneBtnText: "Finalizar Tour",
      progressText: "{{current}} de {{total}}",
      overlayColor: theme === 'dark' ? "rgba(0, 0, 0, 0.85)" : "rgba(0, 0, 0, 0.75)",
      stagePadding: 8,
      popoverClass: `espacopessoal-tour-popover ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`,
      onNextClick: (_element, _step, options) => {
        const stepIndex = options.state?.activeIndex ?? 0;
        const nextStepIndex = stepIndex + 1;
        setCurrentStep(nextStepIndex);
        setTourProgress(Math.round((nextStepIndex / tourSteps.length) * 100));
        setCompletedSteps(prev => new Set([...prev, stepIndex]));
        
        onStepChange?.(nextStepIndex);
        
        if (debug) {
          console.log(`Tour: Avançando para passo ${nextStepIndex}/${tourSteps.length}`);
        }
        
        // Garantir que elementos existem antes de prosseguir
        if (nextStepIndex < tourSteps.length) {
          const nextStepSelector = tourSteps[nextStepIndex]?.element;
          if (nextStepSelector && typeof nextStepSelector === 'string' && nextStepSelector !== "body") {
            const element = document.querySelector(nextStepSelector);
            if (!element) {
              console.warn(`Tour: Elemento não encontrado - ${nextStepSelector}`);
              // Pular para próximo passo válido
              return;
            }
          }
        }
      },
      onPrevClick: (_element, _step, options) => {
        const stepIndex = options.state?.activeIndex ?? 0;
        const prevStepIndex = Math.max(0, stepIndex - 1);
        setCurrentStep(prevStepIndex);
        setTourProgress(Math.round((prevStepIndex / tourSteps.length) * 100));
        
        onStepChange?.(prevStepIndex);
        
        if (debug) {
          console.log(`Tour: Retrocedendo para passo ${prevStepIndex}`);
        }
      },
      onDestroyed: () => {
        localStorage.setItem("espacopessoal-tour-completed", "true");
        localStorage.removeItem("espacopessoal-tour-skipped");
        localStorage.setItem("espacopessoal-tour-completion-date", new Date().toISOString());
        
        if (debug) {
          console.log(`Tour: Completado com sucesso após ${currentStep + 1} passos`);
        }
        
        onTourComplete?.();
      },
      onCloseClick: () => {
        localStorage.setItem("espacopessoal-tour-skipped", "true");
        onTourSkip?.();
      },
    });
  };

  const startTour = () => {
    setShowWelcomeCard(false);
    
    // Pequeno delay para garantir que a UI está estável antes de iniciar
    setTimeout(() => {
      const driverObj = createTourDriver();
      try {
        driverObj.drive();
      } catch (error) {
        console.error("Erro ao iniciar tour:", error);
        // Fallback: marcar como pulado se houver erro
        localStorage.setItem("espacopessoal-tour-skipped", "true");
        onTourSkip?.();
      }
    }, 300);
  };

  const skipTour = () => {
    setShowWelcomeCard(false);
    localStorage.setItem("espacopessoal-tour-skipped", "true");
    onTourSkip?.();
  };

  const restartTour = () => {
    localStorage.removeItem("espacopessoal-tour-completed");
    localStorage.removeItem("espacopessoal-tour-skipped");
    
    // Pequeno delay para garantir que a UI está estável
    setTimeout(() => {
      const driverObj = createTourDriver();
      try {
        driverObj.drive();
      } catch (error) {
        console.error("Erro ao reiniciar tour:", error);
        // Fallback: marcar como pulado se houver erro
        localStorage.setItem("espacopessoal-tour-skipped", "true");
        onTourSkip?.();
      }
    }, 300);
  };

  if (!mounted || isLoading) {
    return null;
  }

  return (
    <>
      {/* Card de Boas-vindas para Primeira Visita */}
      <AnimatePresence>
        {showWelcomeCard && isFirstVisit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative mx-4 max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              {/* Botão Fechar */}
              <button
                onClick={skipTour}
                className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>

              {/* Conteúdo do Card */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 20 }}
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  <PlayCircle className="text-white" size={32} />
                </motion.div>

                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl"
                >
                  Bem-vindo ao Espaço Pessoal! 🎉
                </motion.h2>

                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 text-sm text-gray-600 sm:text-base"
                >
                  Descobra todos os recursos incríveis da nossa plataforma de
                  edição colaborativa. O tour guiado vai te mostrar como criar,
                  organizar e colaborar em documentos de forma eficiente.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={startTour}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-white transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
                    >
                      <PlayCircle className="mr-2" size={18} />
                      Começar Tour Guiado
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={skipTour}
                      variant="outline"
                      className="w-full py-3"
                    >
                      Pular e Explorar Sozinho
                    </Button>
                  </motion.div>
                </motion.div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progresso do tour</span>
                    <span>{tourSteps.length} passos</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                      style={{ width: '0%' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Você pode refazer o tour a qualquer momento
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante para Refazer Tour */}
      {showButton && !showWelcomeCard && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={restartTour}
              className="tour-button flex items-center gap-2 rounded-full border-2 border-white/20 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl sm:px-5 sm:py-3 sm:text-base"
              title="Clique para refazer o tour de boas-vindas"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <PlayCircle size={16} className="sm:h-[18px] sm:w-[18px]" />
              </motion.div>
              <span className="hidden font-medium sm:inline">Tour Guiado</span>
              <span className="font-medium sm:hidden">Tour</span>
              {tourProgress > 0 && (
                <span className="text-xs opacity-75">
                  {Math.round(tourProgress)}%
                </span>
              )}
            </Button>
          </motion.div>

          {/* Animação de Pulse */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      )}
    </>
  );
}
