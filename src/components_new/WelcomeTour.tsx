"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useConvexUser } from "../hooks/use-convex-user";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { PlayCircle, X } from "lucide-react";
import { driver } from "driver.js";
import { motion, AnimatePresence } from "framer-motion";
import { getFilteredTourSteps } from "./tourSteps";
import "driver.js/dist/driver.css";
import "./tour-styles.css";

interface WelcomeTourProps {
  autoStart?: boolean;
  showButton?: boolean;
  onTourComplete?: () => void;
  onTourSkip?: () => void;
  onStepChange?: (step: number) => void;
  debug?: boolean;
  theme?: "light" | "dark";
  showProgress?: boolean;
}

export function WelcomeTour({
  autoStart = false,
  showButton = true,
  onTourComplete,
  onTourSkip,
  onStepChange,
  debug = false,
  theme = "light",
}: WelcomeTourProps) {
  const [mounted, setMounted] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Authentication checks
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const isAuthenticated = status === "authenticated" && session && convexUserId;

    if (!mounted || !isAuthenticated) return;
  const userSettings = useQuery(
    
    // Check if tour was completed/skipped for this specific user
    const tourCompleted = userSettings?.tourCompleted;
    const tourSkipped = userSettings?.tourSkipped;
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const updateUserSettings = useMutation(api.userSettings.updateTourStatus);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourProgress, setTourProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
  }, [mounted, autoStart, isAuthenticated, convexUserId, isUserLoading, userSettings]);
    // Verificar se é a primeira visita do usuário
  // Don't render anything if user is not authenticated
    const authFilteredSteps = getFilteredTourSteps(isAuthenticated);
    const availableSteps = authFilteredSteps.filter(step => {
      if (step.element === "body") return true;
      if (typeof step.element === "string") {
        const element = document.querySelector(step.element);
        return element !== null;
      }
      return true;
    });
  if (!isAuthenticated) {
    return null;
  }
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
      steps: availableSteps,
      nextBtnText: "Próximo",
      prevBtnText: "Anterior",
      doneBtnText: "Finalizar Tour",
      progressText: "{{current}} de {{total}}",
      overlayColor:
        theme === "dark" ? "rgba(0, 0, 0, 0.85)" : "rgba(0, 0, 0, 0.75)",
      overlayOpacity: 0.75,
      stagePadding: 8,
      popoverClass: `espacopessoal-tour-popover ${theme === "dark" ? "dark-theme" : "light-theme"}`,
      popoverOffset: 10,
      onNextClick: (_element, _step, options) => {
        const stepIndex = options.state?.activeIndex ?? 0;
        const nextStepIndex = stepIndex + 1;
        setCurrentStep(nextStepIndex);
        setTourProgress(Math.round((nextStepIndex / availableSteps.length) * 100));

        onStepChange?.(nextStepIndex);

        if (debug) {
          console.log(
            `Tour: Avançando para passo ${nextStepIndex}/${availableSteps.length}`,
          );
        }

        // Garantir que elementos existem antes de prosseguir
        if (nextStepIndex < availableSteps.length) {
          const nextStepSelector = tourSteps[nextStepIndex]?.element;
          if (
            nextStepSelector &&
            typeof nextStepSelector === "string" &&
            nextStepSelector !== "body"
          ) {
            const element = document.querySelector(nextStepSelector);
            if (!element) {
              console.warn(
                `Tour: Elemento não encontrado - ${nextStepSelector}`,
              );
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
        setTourProgress(Math.round((prevStepIndex / availableSteps.length) * 100));

        onStepChange?.(prevStepIndex);

        if (debug) {
          console.log(`Tour: Retrocedendo para passo ${prevStepIndex}`);
        }
      },
      onDestroyed: async () => {
        try {
          await updateUserSettings({
            userId: convexUserId,
            tourCompleted: true,
            tourSkipped: false,
            tourCompletionDate: Date.now(),
          });
        } catch (error) {
          console.error("Error updating tour completion status:", error);
        }

        if (debug) {
          console.log(
            `Tour: Completado com sucesso após ${currentStep + 1} passos`,
          );
        }

        onTourComplete?.();
      },
      },
      onCloseClick: async () => {
        try {
          await updateUserSettings({
            userId: convexUserId,
            tourSkipped: true,
          });
        } catch (error) {
          console.error("Error updating tour skip status:", error);
        }
        onTourSkip?.();
      },
  if (!mounted || isLoading || isUserLoading || userSettings === undefined) {
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
        updateUserSettings({
          userId: convexUserId,
          tourSkipped: true,
        }).catch(console.error);
        onTourSkip?.();
      }
    }, 300);
  };

  const skipTour = () => {
    setShowWelcomeCard(false);
        updateUserSettings({
          userId: convexUserId,
          tourSkipped: true,
        }).catch(console.error);
    onTourSkip?.();
  };

  const restartTour = () => {
    updateUserSettings({
      userId: convexUserId,
      tourCompleted: false,
      tourSkipped: false,
    }).catch(console.error);

    // Pequeno delay para garantir que a UI está estável
    setTimeout(() => {
      const driverObj = createTourDriver();
      try {
        driverObj.drive();
      } catch (error) {
        console.error("Erro ao reiniciar tour:", error);
        // Fallback: marcar como pulado se houver erro
        updateUserSettings({
          userId: convexUserId,
          tourSkipped: true,
        }).catch(console.error);
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
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
                    <span>{availableSteps.length} passos</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                      style={{ width: `${tourProgress}%` }}
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
          className="fixed bottom-4 right-4 z-[9997] sm:bottom-6 sm:right-6"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ pointerEvents: "auto" }}
          >
            <Button
              onClick={restartTour}
              className="tour-button flex items-center gap-2 rounded-full border-2 border-white/20 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl sm:px-5 sm:py-3 sm:text-base"
              title="Clique para refazer o tour de boas-vindas"
            >
              <PlayCircle size={16} className="sm:h-[18px] sm:w-[18px]" />
              <span className="hidden font-medium sm:inline">Tour Guiado</span>
              <span className="font-medium sm:hidden">Tour</span>
              {tourProgress > 0 && (
                <span className="text-xs opacity-75">
                  {Math.round(tourProgress)}%
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
