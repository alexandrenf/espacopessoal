"use client";

import { motion } from "framer-motion";
import {
  Baby,
  Calendar,
  Clock,
  Heart,
  Stethoscope,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface GestationalTimelineProps {
  weeks: number;
  days: number;
  totalDays: number;
  dpp: string;
  method: string;
  effectiveDUM: string;
  className?: string;
}

export function GestationalTimeline({
  weeks,
  days,
  totalDays,
  dpp,
  method,
  effectiveDUM,
  className = "",
}: GestationalTimelineProps) {
  // Utility function to safely format dates for Brazilian locale
  const formatDateToBrazilian = (dateString: string): string => {
    try {
      // Parse the date string as ISO date to avoid timezone issues
      const parts = dateString.split("-");
      if (parts.length !== 3) {
        throw new Error("Invalid date format");
      }

      const year = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10);
      const day = parseInt(parts[2]!, 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error("Invalid date components");
      }

      const date = new Date(year, month - 1, day); // month is 0-indexed

      return date.toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "America/Sao_Paulo", // Ensure Brazilian timezone
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Fallback to original string
    }
  };

  const getGestationalStage = (
    weeks: number,
  ): {
    stage: string;
    color: string;
    bgColor: string;
    description: string;
    icon: React.ElementType;
  } => {
    if (weeks < 12) {
      return {
        stage: "1º Trimestre",
        color: "rgb(59, 130, 246)", // blue-500
        bgColor: "rgb(239, 246, 255)", // blue-50
        description: "Organogênese e formação dos órgãos",
        icon: Heart,
      };
    } else if (weeks < 27) {
      return {
        stage: "2º Trimestre",
        color: "rgb(34, 197, 94)", // green-500
        bgColor: "rgb(240, 253, 244)", // green-50
        description: "Crescimento fetal e menor risco",
        icon: Baby,
      };
    } else if (weeks < 37) {
      return {
        stage: "3º Trimestre",
        color: "rgb(249, 115, 22)", // orange-500
        bgColor: "rgb(255, 247, 237)", // orange-50
        description: "Maturação e preparação para o parto",
        icon: Clock,
      };
    } else if (weeks < 41) {
      return {
        stage: "A Termo",
        color: "rgb(34, 197, 94)", // green-500
        bgColor: "rgb(240, 253, 244)", // green-50
        description: "Período ideal para o nascimento",
        icon: CheckCircle,
      };
    } else {
      return {
        stage: "Pós-termo",
        color: "rgb(239, 68, 68)", // red-500
        bgColor: "rgb(254, 242, 242)", // red-50
        description: "Gravidez prolongada - monitoramento intensivo",
        icon: AlertCircle,
      };
    }
  };

  const currentStage = getGestationalStage(weeks);
  const IconComponent = currentStage.icon;

  // Timeline milestones
  const milestones = [
    {
      week: 2,
      label: "Implantação",
      description: "Embrião se implanta no útero",
    },
    {
      week: 4,
      label: "Teste positivo",
      description: "Detecção de gravidez em teste domiciliar",
    },
    { week: 8, label: "Embrião", description: "Formação básica dos órgãos" },
    {
      week: 11,
      label: "Translucência nucal",
      description: "Ultrassom para rastreio cromossômico",
    },
    { week: 13, label: "Feto", description: "Fim do 1º trimestre" },
    {
      week: 16,
      label: "Quickening",
      description: "Percepção dos primeiros movimentos fetais",
    },
    {
      week: 20,
      label: "Anatomia",
      description: "Ultrassom morfológico (18–22 s)",
    },
    {
      week: 24,
      label: "Glicose",
      description: "Triagem de diabetes gestacional",
    },
    {
      week: 24,
      label: "Viabilidade",
      description: "Viabilidade extrauterina (23–24 s)",
    },
    { week: 27, label: "3º trimestre", description: "Início do 3º trimestre" },
    { week: 32, label: "Maturação", description: "Maturação pulmonar" },
    {
      week: 35,
      label: "Streptococcus B",
      description: "Rastreamento vaginal/retal",
    },
    {
      week: 39,
      label: "Termo pleno",
      description: "Período de termo completo (39–40 s)",
    },
    { week: 40, label: "DPP", description: "Data provável do parto" },
    {
      week: 41,
      label: "Pós-termo",
      description: "Gestação prolongada (>41 s)",
    },
  ];

  // Calculate progress percentage (0-100%)
  const maxWeeks = 41;
  const progressPercentage = Math.min((weeks / maxWeeks) * 100, 100);

  // Calculate current milestone
  const currentMilestone = milestones.findIndex((m) => weeks < m.week);
  const completedMilestones =
    currentMilestone === -1 ? milestones.length : currentMilestone;

  return (
    <div className={`rounded-xl border bg-white p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="mb-6 text-center">
        <motion.div
          className="mb-2 text-4xl font-bold text-slate-900"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {weeks}s{days}d
        </motion.div>
        <p className="mb-3 text-lg text-slate-600">
          {weeks} semanas e {days} dias
        </p>
        <Badge
          className="border px-3 py-1 text-sm"
          style={{
            color: currentStage.color,
            backgroundColor: currentStage.bgColor,
            borderColor: currentStage.color,
          }}
        >
          <IconComponent className="mr-1 h-4 w-4" />
          {currentStage.stage}
        </Badge>
      </div>

      {/* Progress Timeline */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            Progresso da Gravidez
          </span>
          <span className="text-sm font-medium text-slate-700">
            {progressPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="relative">
          {/* Background bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            {/* Progress bar */}
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: currentStage.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>

          {/* Current position indicator */}
          <motion.div
            className="absolute top-0 -mt-1.5 h-6 w-6 rounded-full border-2 border-white shadow-lg"
            style={{
              backgroundColor: currentStage.color,
              left: `${progressPercentage}%`,
              transform: "translateX(-50%)",
            }}
            initial={{ left: "0%" }}
            animate={{ left: `${progressPercentage}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </div>

        {/* Week markers */}
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>0w</span>
          <span>13w</span>
          <span>27w</span>
          <span>37w</span>
          <span>41w</span>
        </div>
      </div>

      {/* Milestone Indicators */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        {milestones.slice(0, 6).map((milestone, index) => {
          const isCompleted = weeks >= milestone.week;
          const isCurrent =
            weeks >= milestone.week &&
            weeks < (milestones[index + 1]?.week ?? 50);

          return (
            <motion.div
              key={milestone.week}
              className={`rounded-lg border p-2 text-center transition-all ${
                isCompleted
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              } ${isCurrent ? "ring-2 ring-green-400" : ""}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="mb-1 flex items-center justify-center">
                <CheckCircle
                  className={`h-4 w-4 ${isCompleted ? "text-green-600" : "text-slate-400"}`}
                />
              </div>
              <div className="text-xs font-medium">{milestone.label}</div>
              <div className="text-xs text-slate-500">{milestone.week}w</div>
            </motion.div>
          );
        })}
      </div>

      {/* Key Information Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              Data Provável do Parto
            </span>
          </div>
          <p className="text-lg font-bold text-blue-800">
            {formatDateToBrazilian(dpp)}
          </p>
        </div>

        <div className="rounded-lg bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-900">
              Método Utilizado
            </span>
          </div>
          <p className="text-lg font-bold text-green-800">{method}</p>
        </div>

        <div className="rounded-lg bg-purple-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Heart className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-purple-900">DUM Efetiva</span>
          </div>
          <p className="text-lg font-bold text-purple-800">
            {formatDateToBrazilian(effectiveDUM)}
          </p>
        </div>

        <div className="rounded-lg bg-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-orange-900">Total de Dias</span>
          </div>
          <p className="text-lg font-bold text-orange-800">{totalDays} dias</p>
        </div>
      </div>

      {/* Stage Description */}
      <motion.div
        className="rounded-lg border border-slate-200 p-4"
        style={{ backgroundColor: currentStage.bgColor }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <IconComponent
            className="h-5 w-5"
            style={{ color: currentStage.color }}
          />
          Características do {currentStage.stage}
        </h4>
        <p className="text-sm text-slate-700">{currentStage.description}</p>
      </motion.div>

      {/* Time Remaining */}
      <div className="mt-4 text-center">
        <p className="text-sm text-slate-600">
          {weeks < 40 ? (
            <>
              <span className="font-medium">Tempo estimado restante:</span>{" "}
              {40 - weeks} semanas
            </>
          ) : weeks === 40 ? (
            <span className="font-medium text-green-600">
              Na data provável do parto
            </span>
          ) : weeks < 41 ? (
            <span className="font-medium text-orange-600">
              {weeks - 40} semanas além da DPP (ainda a termo)
            </span>
          ) : (
            <span className="font-medium text-red-600">
              {weeks - 40} semanas além da DPP (pós-termo)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
