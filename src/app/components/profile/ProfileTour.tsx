"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { PlayCircle } from "lucide-react";
import { driver } from "driver.js";
import { motion } from "framer-motion";
import "driver.js/dist/driver.css";

export function ProfileTour() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if the user has seen the tour before
    const tourSeen = localStorage.getItem("profileTourSeen");
    if (!tourSeen) {
      startTour();
      localStorage.setItem("profileTourSeen", "true");
    }
  }, [mounted]);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      showButtons: ["next", "previous", "close"],
      steps: [
        {
          element: ".profile-header",
          popover: {
            title: "Painel de Perfil",
            description:
              "Bem-vindo ao seu Painel de Perfil! Aqui você pode gerenciar suas informações pessoais e configurações.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: ".profile-dashboard",
          popover: {
            title: "Informações Pessoais",
            description:
              "Aqui você encontra suas informações pessoais e pode atualizar seus dados quando necessário.",
            side: "right",
            align: "start",
          },
        },
        {
          element: 'input[name="name"]',
          popover: {
            title: "Nome",
            description:
              "Atualize seu nome completo para personalizar sua experiência.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: 'input[name="email"]',
          popover: {
            title: "Email",
            description:
              "Seu email é usado para login e comunicações importantes.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: 'input[name="image"]',
          popover: {
            title: "Imagem de Perfil",
            description:
              "Adicione uma URL de imagem para personalizar seu avatar de perfil.",
            side: "top",
            align: "center",
          },
        },
        {
          element: ".edit-profile-btn",
          popover: {
            title: "Editar Perfil",
            description:
              "Clique aqui para editar suas informações pessoais a qualquer momento.",
            side: "left",
            align: "center",
          },
        },
      ],
      nextBtnText: "Próximo",
      prevBtnText: "Anterior",
      doneBtnText: "Finalizar",
      // Remove the problematic property (overlayText)
      overlayColor: "rgba(0, 0, 0, 0.65)",
      stagePadding: 10,
      popoverClass: "driver-popover-custom",
    });

    driverObj.drive();
    return driverObj;
  };

  const restartTour = () => {
    startTour();
  };

  if (!mounted) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          onClick={restartTour}
          className="flex items-center gap-2 rounded-full border-2 border-white/20 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <PlayCircle size={18} />
          </motion.div>
          <span className="font-medium">Tour Guiado</span>
        </Button>
      </motion.div>

      {/* Floating animation ring */}
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
  );
}
