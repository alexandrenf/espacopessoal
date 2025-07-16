"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface BMIIndicatorProps {
  bmi: number;
  classification: string;
  color: string;
  warnings?: string[];
}

const BMI_RANGES = [
  {
    min: 0,
    max: 18.5,
    label: "Baixo Peso",
    color: "bg-blue-400",
    textColor: "text-blue-600",
    description: "Abaixo do peso ideal",
  },
  {
    min: 18.5,
    max: 25,
    label: "Normal",
    color: "bg-green-400",
    textColor: "text-green-600",
    description: "Peso saudável",
  },
  {
    min: 25,
    max: 30,
    label: "Sobrepeso",
    color: "bg-yellow-400",
    textColor: "text-yellow-600",
    description: "Acima do peso ideal",
  },
  {
    min: 30,
    max: 35,
    label: "Obesidade I",
    color: "bg-orange-400",
    textColor: "text-orange-600",
    description: "Obesidade grau I",
  },
  {
    min: 35,
    max: 40,
    label: "Obesidade II",
    color: "bg-red-400",
    textColor: "text-red-600",
    description: "Obesidade grau II",
  },
  {
    min: 40,
    max: 50,
    label: "Obesidade III",
    color: "bg-purple-400",
    textColor: "text-purple-600",
    description: "Obesidade grau III",
  },
];

export function BMIIndicator({ bmi, classification, color, warnings }: BMIIndicatorProps) {
  const maxScale = 45; // Maximum BMI for scale display
  const bmiPosition = Math.min((bmi / maxScale) * 100, 100);

  // Find current range for additional info
  const currentRange = BMI_RANGES.find(range => bmi >= range.min && bmi < range.max) ?? BMI_RANGES[BMI_RANGES.length - 1]!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6"
    >
      {/* Main Result Display */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-2 text-4xl font-bold text-blue-600"
        >
          {bmi.toFixed(1)}
        </motion.div>
        <div className={`text-xl font-semibold ${color} mb-2`}>
          {classification}
        </div>
        <div className="text-sm text-slate-600">
          {currentRange.description}
        </div>
      </div>

      {/* Visual BMI Scale */}
      <div className="space-y-4">
        <div className="relative">
          {/* Scale Background */}
          <div className="flex h-8 overflow-hidden rounded-full shadow-inner">
            {BMI_RANGES.map((range, index) => (
              <div
                key={index}
                className={`${range.color} transition-all duration-300 hover:brightness-110`}
                style={{
                  width: `${((Math.min(range.max, maxScale) - range.min) / maxScale) * 100}%`,
                }}
              />
            ))}
          </div>

          {/* BMI Indicator */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute top-0 h-8 w-2 rounded-full border-2 border-gray-800 bg-white shadow-lg"
            style={{
              left: `${bmiPosition}%`,
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
              left: `${bmiPosition}%`,
              transform: "translateX(-50%)",
            }}
          >
            {bmi.toFixed(1)}
            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
          </motion.div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between px-1 text-xs text-slate-600">
          <span>16</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40+</span>
        </div>

        {/* Range Legend */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {BMI_RANGES.map((range, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-lg p-2 transition-all duration-200 ${
                bmi >= range.min && bmi < range.max
                  ? "bg-white/80 shadow-sm ring-2 ring-blue-200"
                  : "bg-white/40"
              }`}
            >
              <div className={`h-3 w-3 rounded-full ${range.color}`} />
              <div>
                <div className="font-medium text-slate-700">{range.label}</div>
                <div className="text-slate-500">
                  {range.min}-{range.max === 50 ? "40+" : range.max}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-700">
            {warnings.join("; ")}
          </div>
        </motion.div>
      )}

      {/* Health Recommendations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-lg bg-white/60 p-4"
      >
        <h4 className="mb-2 font-semibold text-slate-800">Recomendações:</h4>
        <div className="space-y-1 text-sm text-slate-600">
          {bmi < 18.5 && (
            <>
              <p>• Consulte um nutricionista para ganho de peso saudável</p>
              <p>• Considere avaliação médica para descartar causas subjacentes</p>
            </>
          )}
          {bmi >= 18.5 && bmi < 25 && (
            <>
              <p>• Mantenha uma alimentação equilibrada</p>
              <p>• Continue com atividade física regular</p>
            </>
          )}
          {bmi >= 25 && bmi < 30 && (
            <>
              <p>• Considere redução de peso através de dieta e exercícios</p>
              <p>• Acompanhamento nutricional pode ser benéfico</p>
            </>
          )}
          {bmi >= 30 && (
            <>
              <p>• Recomenda-se acompanhamento médico especializado</p>
              <p>• Avaliação de comorbidades associadas</p>
              <p>• Plano estruturado de perda de peso</p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}