'use client';

import { useEffect, useState } from 'react';
import { Button } from "~/components/ui/button";
import { RefreshCcw } from 'lucide-react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function ProfileTour() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if the user has seen the tour before
    const tourSeen = localStorage.getItem('profileTourSeen');
    if (!tourSeen) {
      startTour();
      localStorage.setItem('profileTourSeen', 'true');
    }
  }, [mounted]);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
        {
          element: '.profile-header',
          popover: {
            title: 'Painel de Perfil',
            description: 'Bem-vindo ao seu Painel de Perfil! Aqui você pode gerenciar suas informações pessoais e configurações.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '.profile-dashboard',
          popover: {
            title: 'Informações Pessoais',
            description: 'Aqui você encontra suas informações pessoais e pode atualizar seus dados quando necessário.',
            side: 'right',
            align: 'start',
          }
        },
        {
          element: 'input[name="name"]',
          popover: {
            title: 'Nome',
            description: 'Atualize seu nome completo para personalizar sua experiência.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: 'input[name="email"]',
          popover: {
            title: 'Email',
            description: 'Seu email é usado para login e comunicações importantes.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: 'input[name="image"]',
          popover: {
            title: 'Imagem de Perfil',
            description: 'Adicione uma URL de imagem para personalizar seu avatar de perfil.',
            side: 'top',
            align: 'center',
          }
        },
        {
          element: '.edit-profile-btn',
          popover: {
            title: 'Editar Perfil',
            description: 'Clique aqui para editar suas informações pessoais a qualquer momento.',
            side: 'left',
            align: 'center',
          }
        },
        {
          element: '.notepad-settings',
          popover: {
            title: 'Configurações do Bloco de Notas',
            description: 'Configure suas preferências do Bloco de Notas, incluindo URL, privacidade e senha de acesso.',
            side: 'left',
            align: 'start',
          }
        }
      ],
      nextBtnText: 'Próximo',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      // Remove the problematic property (overlayText)
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      stagePadding: 10,
      popoverClass: 'driver-popover-custom',
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
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={restartTour} 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 bg-white shadow-md hover:bg-gray-100"
      >
        <RefreshCcw size={16} />
        <span>Reiniciar Tour</span>
      </Button>
    </div>
  );
}