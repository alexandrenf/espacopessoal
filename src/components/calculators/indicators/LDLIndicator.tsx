"use client";

import { motion } from "framer-motion";
import { AlertCircle, Heart, TrendingUp, TrendingDown } from "lucide-react";

interface LDLIndicatorProps {
  ldl: number;
  classification: string;
  color: string;
  totalCholesterol: number;
  hdl: number;
  triglycerides: number;
}

const LDL_RANGES = [
  {
    min: 0,
    max: 100,
    label: "Ótimo",
    color: "bg-green-500",
    textColor: "text-green-600",
    description: "Risco muito baixo",
    recommendation: "Manter estilo de vida saudável",
  },
  {
    min: 100,
    max: 130,
    label: "Desejável",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    description: "Risco baixo",
    recommendation: "Continuar com hábitos saudáveis",
  },
  {
    min: 130,
    max: 160,
    label: "Limítrofe",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    description: "Risco moderado",
    recommendation: "Mudanças no estilo de vida",
  },
  {
    min: 160,
    max: 190,
    label: "Alto",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    description: "Risco elevado",
    recommendation: "Avaliação médica necessária",
  },
  {
    min: 190,
    max: 300,
    label: "Muito Alto",
    color: "bg-red-500",
    textColor: "text-red-600",
    description: "Risco muito elevado",
    recommendation: "Tratamento médico urgente",
  },
];

export function LDLIndicator({
  ldl,
  classification,
  color,
  totalCholesterol,
  hdl,
  triglycerides,
}: LDLIndicatorProps) {
  const maxScale = 300;
  const ldlPosition = Math.min((ldl / maxScale) * 100, 100);

  // Find current range
  const currentRange =
    LDL_RANGES.find((range) => ldl >= range.min && ldl < range.max) ??
    LDL_RANGES[LDL_RANGES.length - 1]!;

  // Calculate additional metrics
  const nonHDLCholesterol = totalCholesterol - hdl;
  const cholesterolRatio = totalCholesterol / hdl;

  // Risk assessment
  const getRiskLevel = () => {
    if (ldl < 100)
      return { level: "Baixo", icon: TrendingDown, color: "text-green-600" };
    if (ldl < 130)
      return {
        level: "Baixo-Moderado",
        icon: TrendingDown,
        color: "text-blue-600",
      };
    if (ldl < 160)
      return { level: "Moderado", icon: TrendingUp, color: "text-yellow-600" };
    if (ldl < 190)
      return { level: "Alto", icon: TrendingUp, color: "text-orange-600" };
    return { level: "Muito Alto", icon: TrendingUp, color: "text-red-600" };
  };

  const riskAssessment = getRiskLevel();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-6"
    >
      {/* Main Result Display */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-2 text-4xl font-bold text-red-600"
        >
          {ldl} <span className="text-lg">mg/dL</span>
        </motion.div>
        <div className={`text-xl font-semibold ${color} mb-2`}>
          {classification}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <riskAssessment.icon className={`h-4 w-4 ${riskAssessment.color}`} />
          <span>Risco {riskAssessment.level}</span>
        </div>
      </div>

      {/* Visual LDL Progress Bar */}
      <div className="space-y-4">
        <div className="relative">
          {/* Progress Bar Background */}
          <div className="flex h-8 overflow-hidden rounded-full shadow-inner">
            {LDL_RANGES.map((range, index) => (
              <div
                key={index}
                className={`${range.color} transition-all duration-300 hover:brightness-110`}
                style={{
                  width: `${((Math.min(range.max, maxScale) - range.min) / maxScale) * 100}%`,
                }}
              />
            ))}
          </div>

          {/* LDL Indicator */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute top-0 h-8 w-2 rounded-full border-2 border-gray-800 bg-white shadow-lg"
            style={{
              left: `${ldlPosition}%`,
              transform: "translateX(-50%)",
            }}
          />

          {/* Value Tooltip */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute -top-10 rounded-lg bg-gray-800 px-3 py-1 text-sm text-white shadow-lg"
            style={{
              left: `${ldlPosition}%`,
              transform: "translateX(-50%)",
            }}
          >
            {ldl} mg/dL
            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
          </motion.div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between px-1 text-xs text-slate-600">
          <span>0</span>
          <span>100</span>
          <span>130</span>
          <span>160</span>
          <span>190</span>
          <span>300+</span>
        </div>

        {/* Range Legend */}
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {LDL_RANGES.map((range, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-lg p-2 transition-all duration-200 ${
                ldl >= range.min && ldl < range.max
                  ? "bg-white/80 shadow-sm ring-2 ring-red-200"
                  : "bg-white/40"
              }`}
            >
              <div className={`h-3 w-3 rounded-full ${range.color}`} />
              <div className="flex-1">
                <div className="font-medium text-slate-700">{range.label}</div>
                <div className="text-slate-500">
                  {range.min}-{range.max === 300 ? "190+" : range.max} mg/dL
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="rounded-lg bg-white/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <h4 className="font-semibold text-slate-800">Colesterol não-HDL</h4>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {nonHDLCholesterol}{" "}
            <span className="text-sm font-normal">mg/dL</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Meta: &lt; {ldl < 100 ? "130" : ldl < 130 ? "160" : "190"} mg/dL
          </div>
        </div>

        <div className="rounded-lg bg-white/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold text-slate-800">Razão CT/HDL</h4>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {cholesterolRatio.toFixed(1)}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {cholesterolRatio < 4.5
              ? "Ideal"
              : cholesterolRatio < 5.0
                ? "Aceitável"
                : "Elevada"}
          </div>
        </div>
      </motion.div>

      {/* Warnings for high triglycerides */}
      {triglycerides >= 400 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
          <div className="text-sm text-red-700">
            <strong>Atenção:</strong> Triglicerídeos ≥ 400 mg/dL. A fórmula de
            Friedewald pode não ser precisa. Considere dosagem direta do LDL ou
            fórmula de Martin-Hopkins.
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="rounded-lg bg-white/60 p-4"
      >
        <h4 className="mb-2 font-semibold text-slate-800">Recomendações:</h4>
        <div className="space-y-1 text-sm text-slate-600">
          <p>• {currentRange.recommendation}</p>
          {ldl >= 130 && (
            <p>• Considere avaliação de risco cardiovascular global</p>
          )}
          {ldl >= 160 && (
            <p>• Avaliação médica para possível terapia medicamentosa</p>
          )}
          {ldl >= 190 && <p>• Investigação de hipercolesterolemia familiar</p>}
          <p>• Dieta com redução de gorduras saturadas e trans</p>
          <p>• Atividade física regular (150 min/semana)</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
