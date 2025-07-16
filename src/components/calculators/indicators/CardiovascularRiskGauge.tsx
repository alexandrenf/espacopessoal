"use client";

import { motion } from "framer-motion";
import { Shield, Target, AlertCircle, TrendingUp, Zap } from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface CardiovascularRiskGaugeProps {
  riskPercentage: number;
  riskCategory: string;
  framinghamScore: number;
  hasHighRiskConditions: boolean;
  aggravatingFactors: string[];
  reclassification?: string;
  gender: "M" | "F";
  className?: string;
}

export function CardiovascularRiskGauge({
  riskPercentage,
  riskCategory,
  framinghamScore,
  hasHighRiskConditions,
  aggravatingFactors,
  reclassification,
  gender,
  className = "",
}: CardiovascularRiskGaugeProps) {
  // Calculate the angle for the gauge (0-180 degrees)
  const maxRisk = 30; // Maximum risk percentage for gauge
  const angle = Math.min((riskPercentage / maxRisk) * 180, 180);

  const getRiskConfig = (
    category: string,
  ): {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ElementType;
    description: string;
  } => {
    const configs = {
      Baixo: {
        color: "rgb(21, 128, 61)", // green-700 - stronger color for better visibility
        bgColor: "rgb(240, 253, 244)", // green-50
        borderColor: "rgb(21, 128, 61)", // green-700 - stronger border
        icon: Shield,
        description: "Baixo risco de eventos cardiovasculares",
      },
      Intermediário: {
        color: "rgb(161, 98, 7)", // yellow-700 - stronger color for better visibility
        bgColor: "rgb(254, 252, 232)", // yellow-50
        borderColor: "rgb(161, 98, 7)", // yellow-700 - stronger border
        icon: Target,
        description: "Risco intermediário - avaliação adicional recomendada",
      },
      Alto: {
        color: "rgb(185, 28, 28)", // red-700 - stronger color for better visibility
        bgColor: "rgb(254, 242, 242)", // red-50
        borderColor: "rgb(185, 28, 28)", // red-700 - stronger border
        icon: AlertCircle,
        description: "Alto risco - intervenção terapêutica necessária",
      },
      "Muito Alto": {
        color: "rgb(127, 29, 29)", // red-900 - even stronger color for critical risk
        bgColor: "rgb(254, 242, 242)", // red-50
        borderColor: "rgb(127, 29, 29)", // red-900 - stronger border
        icon: AlertCircle,
        description: "Risco muito alto - intervenção imediata",
      },
    } as const;

    return configs[category as keyof typeof configs] ?? configs.Baixo;
  };

  const config = getRiskConfig(riskCategory);
  const IconComponent = config.icon;

  const getGaugeColor = (percentage: number, gender: "M" | "F") => {
    // SBC 2020 sex-specific risk thresholds
    // Low risk: < 5% (both sexes)
    // Moderate risk: 5–20% (men), 5–10% (women)
    // High risk: > 20% (men), > 10% (women)
    // Note: Risk stratifiers may affect these thresholds - see cardiovascular risk calculator logic
    if (percentage < 5) {
      return "rgb(34, 197, 94)"; // green-500 - Low risk for both sexes
    } else if (
      (gender === "M" && percentage < 20) ||
      (gender === "F" && percentage < 10)
    ) {
      return "rgb(234, 179, 8)"; // yellow-500 - Moderate risk (men: 5-20%, women: 5-10%)
    } else {
      return "rgb(239, 68, 68)"; // red-500 - High risk (men: ≥20%, women: ≥10%)
    }
  };

  const gaugeColor = getGaugeColor(riskPercentage, gender);

  return (
    <div className={`rounded-xl border bg-white p-6 shadow-sm ${className}`}>
      {/* Main Gauge */}
      <div className="relative mb-6">
        <div className="flex justify-center">
          <div className="relative h-24 w-48">
            {/* Background arc */}
            <svg
              className="absolute inset-0 h-full w-full rotate-180 transform"
              viewBox="0 0 200 100"
              style={{ overflow: "visible" }}
            >
              <path
                d="M 20 80 A 80 80 0 0 1 180 80"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>

            {/* Colored arc */}
            <svg
              className="absolute inset-0 h-full w-full rotate-180 transform"
              viewBox="0 0 200 100"
              style={{ overflow: "visible" }}
            >
              <motion.path
                d="M 20 80 A 80 80 0 0 1 180 80"
                fill="none"
                stroke={gaugeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="251.2" // Circumference of half circle
                strokeDashoffset={251.2 - (angle / 180) * 251.2}
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (angle / 180) * 251.2 }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            </svg>

            {/* Needle */}
            <motion.div
              className="absolute left-1/2 top-[70px] h-16 w-0.5 origin-bottom rounded-full bg-slate-600"
              style={{
                transform: `translateX(-50%) rotate(${angle - 90}deg)`,
              }}
              initial={{ transform: "translateX(-50%) rotate(-90deg)" }}
              animate={{
                transform: `translateX(-50%) rotate(${angle - 90}deg)`,
              }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <div className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-slate-600" />
            </motion.div>

            {/* Center dot */}
            <div className="absolute left-1/2 top-[70px] h-3 w-3 -translate-x-1/2 transform rounded-full bg-slate-600" />

            {/* Risk labels */}
            <div className="absolute left-2 top-[85px] text-xs font-medium text-slate-500">
              0%
            </div>
            <div className="absolute right-2 top-[85px] text-xs font-medium text-slate-500">
              {maxRisk}%+
            </div>
          </div>
        </div>

        {/* Main Result */}
        <div className="mt-4 text-center">
          <motion.div
            className="mb-2 text-4xl font-bold text-slate-900"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            {riskPercentage.toFixed(1)}%
          </motion.div>
          <p className="mb-3 text-sm text-slate-600">Risco em 10 anos</p>
          <Badge
            className="border px-3 py-1 text-sm"
            style={{
              color: config.color,
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            }}
          >
            <IconComponent
              className="mr-1 h-4 w-4 drop-shadow-sm"
              style={{ color: config.color }}
            />
            Risco {riskCategory}
          </Badge>
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="space-y-3">
        {/* Framingham Score */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-900">
              Escore de Framingham
            </span>
          </div>
          <span className="text-lg font-bold text-slate-800">
            {framinghamScore}
          </span>
        </div>

        {/* High Risk Conditions Alert */}
        {hasHighRiskConditions && (
          <motion.div
            className="rounded-lg border border-red-200 bg-red-50 p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">
                Alto Risco Detectado
              </span>
            </div>
            <p className="text-sm text-red-800">
              Condições de alto risco automático identificadas
            </p>
          </motion.div>
        )}

        {/* Aggravating Factors */}
        {aggravatingFactors.length > 0 && (
          <motion.div
            className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-900">
                Fatores Agravantes
              </span>
            </div>
            <p className="text-sm text-yellow-800">
              {aggravatingFactors.length} fator(es) agravante(s) identificado(s)
            </p>
          </motion.div>
        )}

        {/* Reclassification */}
        {reclassification && (
          <motion.div
            className="rounded-lg border border-blue-200 bg-blue-50 p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Reclassificação</span>
            </div>
            <p className="text-sm text-blue-800">{reclassification}</p>
          </motion.div>
        )}
      </div>

      {/* Risk Description */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-center text-sm text-slate-700">
          {config.description}
        </p>
      </div>
    </div>
  );
}
