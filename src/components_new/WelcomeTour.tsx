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

  const userSettings = useQuery(
    api.userSettings.getUserSettings,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  
  // Check if tour was completed/skipped for this specific user
  const tourCompleted = userSettings?.tourCompleted;
  const tourSkipped = userSettings?.tourSkipped;
  const updateUserSettings = useMutation(api.userSettings.updateTourStatus);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourProgress, setTourProgress] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    
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
  }, [mounted, autoStart, tourCompleted, tourSkipped]);
  
  // Don't render anything if user is not authenticated
  if (!isAuthenticated) {
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

  if (!mounted || isLoading || isUserLoading || userSettings === undefined) {
    return null;
  }
