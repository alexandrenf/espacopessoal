"use client";

import { useState, useEffect, useCallback } from "react";
import { driver } from "driver.js";
import { tourSteps } from "./tourSteps";

interface TourState {
  isActive: boolean;
  currentStep: number;
  isCompleted: boolean;
  isSkipped: boolean;
  hasSeenWelcome: boolean;
}

interface UseTourReturn {
  tourState: TourState;
  startTour: () => void;
  restartTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
  isFirstVisit: boolean;
  canShowWelcome: boolean;
}

const STORAGE_KEYS = {
  COMPLETED: "espacopessoal-tour-completed",
  SKIPPED: "espacopessoal-tour-skipped",
  CURRENT_STEP: "espacopessoal-tour-step",
  WELCOME_SEEN: "espacopessoal-welcome-seen",
  FIRST_VISIT: "espacopessoal-first-visit",
} as const;

export function useTour(): UseTourReturn {
  const [tourState, setTourState] = useState<TourState>({
    isActive: false,
    currentStep: 0,
    isCompleted: false,
    isSkipped: false,
    hasSeenWelcome: false,
  });

  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [canShowWelcome, setCanShowWelcome] = useState(false);

  // Inicializar estado do tour
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED) === "true";
    const skipped = localStorage.getItem(STORAGE_KEYS.SKIPPED) === "true";
    const welcomeSeen =
      localStorage.getItem(STORAGE_KEYS.WELCOME_SEEN) === "true";
    const firstVisitFlag = localStorage.getItem(STORAGE_KEYS.FIRST_VISIT);

    // Detectar primeira visita
    const isFirstTime = !firstVisitFlag && !completed && !skipped;
    if (isFirstTime) {
      localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, "true");
      setIsFirstVisit(true);
      setCanShowWelcome(true);
    }

    setTourState({
      isActive: false,
      currentStep: parseInt(
        localStorage.getItem(STORAGE_KEYS.CURRENT_STEP) ?? "0",
      ),
      isCompleted: completed,
      isSkipped: skipped,
      hasSeenWelcome: welcomeSeen,
    });
  }, []);

  // Criar instância do driver
  const createDriver = useCallback(
    (onComplete?: () => void, onSkip?: () => void) => {
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
        overlayColor: "rgba(0, 0, 0, 0.75)",
        stagePadding: 8,
        popoverClass: "espacopessoal-tour-popover",

        // Callbacks do driver
        onNextClick: (_element, _step, options) => {
          const currentIndex = options.state?.activeIndex ?? 0;
          setTourState((prev) => ({ ...prev, currentStep: currentIndex + 1 }));
          localStorage.setItem(
            STORAGE_KEYS.CURRENT_STEP,
            String(currentIndex + 1),
          );
        },

        onPrevClick: (_element, _step, options) => {
          const currentIndex = options.state?.activeIndex ?? 0;
          setTourState((prev) => ({
            ...prev,
            currentStep: Math.max(0, currentIndex - 1),
          }));
          localStorage.setItem(
            STORAGE_KEYS.CURRENT_STEP,
            String(Math.max(0, currentIndex - 1)),
          );
        },

        onDestroyed: () => {
          // Tour foi completado
          localStorage.setItem(STORAGE_KEYS.COMPLETED, "true");
          localStorage.removeItem(STORAGE_KEYS.SKIPPED);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);

          setTourState((prev) => ({
            ...prev,
            isActive: false,
            isCompleted: true,
            isSkipped: false,
          }));

          onComplete?.();
        },

        onCloseClick: () => {
          // Tour foi pulado/fechado
          localStorage.setItem(STORAGE_KEYS.SKIPPED, "true");
          localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);

          setTourState((prev) => ({
            ...prev,
            isActive: false,
            isSkipped: true,
          }));

          onSkip?.();
        },

        onHighlightStarted: (_element, _step, _options) => {
          setTourState((prev) => ({ ...prev, isActive: true }));
        },
      });
    },
    [],
  );

  // Iniciar tour
  const startTour = useCallback(
    (onComplete?: () => void, onSkip?: () => void) => {
      const driverObj = createDriver(onComplete, onSkip);

      setTourState((prev) => ({
        ...prev,
        isActive: true,
        currentStep: 0,
        hasSeenWelcome: true,
      }));

      localStorage.setItem(STORAGE_KEYS.WELCOME_SEEN, "true");
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "0");
      setCanShowWelcome(false);

      driverObj.drive();

      return driverObj;
    },
    [createDriver],
  );

  // Reiniciar tour
  const restartTour = useCallback(
    (onComplete?: () => void, onSkip?: () => void) => {
      // Limpar estados anteriores
      localStorage.removeItem(STORAGE_KEYS.COMPLETED);
      localStorage.removeItem(STORAGE_KEYS.SKIPPED);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);

      setTourState((prev) => ({
        ...prev,
        isCompleted: false,
        isSkipped: false,
        currentStep: 0,
      }));

      // Iniciar tour
      return startTour(onComplete, onSkip);
    },
    [startTour],
  );

  // Pular tour
  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.SKIPPED, "true");
    localStorage.setItem(STORAGE_KEYS.WELCOME_SEEN, "true");
    localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);

    setTourState((prev) => ({
      ...prev,
      isSkipped: true,
      hasSeenWelcome: true,
      isActive: false,
    }));

    setCanShowWelcome(false);
  }, []);

  // Reset completo do tour
  const resetTour = useCallback(() => {
    // Limpar todo o localStorage relacionado ao tour
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    setTourState({
      isActive: false,
      currentStep: 0,
      isCompleted: false,
      isSkipped: false,
      hasSeenWelcome: false,
    });

    setIsFirstVisit(true);
    setCanShowWelcome(true);
  }, []);

  return {
    tourState,
    startTour,
    restartTour,
    skipTour,
    resetTour,
    isFirstVisit,
    canShowWelcome,
  };
}
