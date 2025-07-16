"use client";

import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface CKDEPIIndicatorProps {
  eGFR: number;
  classification: string;
  color: string;
  age: number;
  sex: "M" | "F";
  creatinine: number;
}

const CKD_STAGES = [
  {
    stage: 1,
    min: 90,
    max: 200,
    label: "Normal ou Alto",
    color: "bg-green-500",
    textColor: "text-green-600",
    description: "Função renal normal",
    recommendation: "Manter estilo de vida saudável",
    riskLevel: "Baixo",
  },
  {
    stage: 2,
    min: 60,
    max: 89,
    label: "Levemente Diminuída",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    description: "Leve redução da função",
    recommendation: "Monitoramento anual",
    riskLevel: "Baixo",
  },
  {
    stage: 3,
    min: 30,
    max: 59,
    label: "Moderadamente Diminuída",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    description: "Redução moderada",
    recommendation: "Acompanhamento nefrológico",
    riskLevel: "Moderado",
  },
  {
    stage: 4,
    min: 15,
    max: 29,
    label: "Severamente Diminuída",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    description: "Redução severa",
    recommendation: "Preparação para TRS",
    riskLevel: "Alto",
  },
  {
    stage: 5,
    min: 0,
    max: 14,
    label: "Falência Renal",
    color: "bg-red-500",
    textColor: "text-red-600",
    description: "Falência renal",
    recommendation: "Terapia de substituição renal",
    riskLevel: "Muito Alto",
  },
];

export function CKDEPIIndicator({
  eGFR,
  classification,
  color,
  age,
  sex,
  creatinine,
}: CKDEPIIndicatorProps) {
  const maxScale = 120;
  const gfrPosition = Math.min((eGFR / maxScale) * 100, 100);

  // Find current stage
  const currentStage =
    CKD_STAGES.find((stage) => eGFR >= stage.min && eGFR <= stage.max) ??
    CKD_STAGES[CKD_STAGES.length - 1]!;

  // Risk assessment based on eGFR
  const getRiskIcon = () => {
    if (eGFR >= 60) return { icon: CheckCircle, color: "text-green-600" };
    if (eGFR >= 30) return { icon: AlertTriangle, color: "text-yellow-600" };
    return { icon: XCircle, color: "text-red-600" };
  };

  const riskIcon = getRiskIcon();

  // Calculate additional metrics
  const isElderly = age >= 65;
  const normalGFRForAge = isElderly ? 60 + (75 - age) * 0.5 : 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6"
    >
      {/* Main Result Display */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-2 text-4xl font-bold text-green-600"
        >
          {eGFR} <span className="text-lg">mL/min/1.73m²</span>
        </motion.div>
        <div className={`text-xl font-semibold ${color} mb-2`}>
          {classification}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <riskIcon.icon className={`h-4 w-4 ${riskIcon.color}`} />
          <span>
            Estágio {currentStage.stage} - Risco {currentStage.riskLevel}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          CKD-EPI 2021 (sem coeficiente racial)
        </div>
      </div>

      {/* Visual CKD Stages Bar */}
      <div className="space-y-4">
        <div className="relative">
          {/* Stages Background - Reversed order for visual clarity */}
          <div className="flex h-8 overflow-hidden rounded-full shadow-inner">
            {[...CKD_STAGES].reverse().map((stage, index) => (
              <div
                key={stage.stage}
                className={`${stage.color} transition-all duration-300 hover:brightness-110`}
                style={{
                  width: `${((Math.min(stage.max, maxScale) - stage.min) / maxScale) * 100}%`,
                }}
              />
            ))}
          </div>

          {/* eGFR Indicator */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute top-0 h-8 w-2 rounded-full border-2 border-gray-800 bg-white shadow-lg"
            style={{
              left: `${gfrPosition}%`,
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
              left: `${gfrPosition}%`,
              transform: "translateX(-50%)",
            }}
          >
            {eGFR} mL/min/1.73m²
            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
          </motion.div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between px-1 text-xs text-slate-600">
          <span>0</span>
          <span>15</span>
          <span>30</span>
          <span>60</span>
          <span>90</span>
          <span>120+</span>
        </div>

        {/* Stages Legend */}
        <div className="grid grid-cols-1 gap-2 text-xs">
          {CKD_STAGES.map((stage) => (
            <div
              key={stage.stage}
              className={`flex items-center gap-3 rounded-lg p-3 transition-all duration-200 ${
                eGFR >= stage.min && eGFR <= stage.max
                  ? "bg-white/80 shadow-sm ring-2 ring-green-200"
                  : "bg-white/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full ${stage.color}`} />
                <span className="font-bold text-slate-700">G{stage.stage}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-700">{stage.label}</div>
                <div className="text-slate-500">
                  {stage.min === 0
                    ? `< ${stage.max + 1}`
                    : `${stage.min}-${stage.max}`}{" "}
                  mL/min/1.73m²
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-medium ${stage.textColor}`}>
                  {stage.riskLevel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Information */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="rounded-lg bg-white/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold text-slate-800">Dados do Paciente</h4>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <div>
              Idade: {age} anos ({sex === "M" ? "Masculino" : "Feminino"})
            </div>
            <div>Creatinina: {creatinine} mg/dL</div>
            <div>
              eGFR esperada: ~{normalGFRForAge.toFixed(0)} mL/min/1.73m²
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h4 className="font-semibold text-slate-800">Interpretação</h4>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <div>{currentStage.description}</div>
            <div className="font-medium">{currentStage.recommendation}</div>
            {isElderly && eGFR >= 45 && (
              <div className="text-blue-600">* Considerar idade avançada</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Clinical Recommendations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-lg bg-white/60 p-4"
      >
        <h4 className="mb-3 font-semibold text-slate-800">
          Recomendações Clínicas:
        </h4>
        <div className="space-y-2 text-sm text-slate-600">
          {eGFR >= 90 && (
            <>
              <p>• Manter pressão arterial &lt; 130/80 mmHg</p>
              <p>• Controle glicêmico se diabético</p>
              <p>• Estilo de vida saudável</p>
            </>
          )}
          {eGFR >= 60 && eGFR < 90 && (
            <>
              <p>• Monitoramento anual da função renal</p>
              <p>• Controle de fatores de risco cardiovascular</p>
              <p>• Investigar causas de DRC se presente</p>
            </>
          )}
          {eGFR >= 30 && eGFR < 60 && (
            <>
              <p>• Encaminhamento para nefrologia</p>
              <p>• Monitoramento semestral</p>
              <p>• Ajuste de medicações conforme TFG</p>
              <p>• Rastreamento de complicações da DRC</p>
            </>
          )}
          {eGFR >= 15 && eGFR < 30 && (
            <>
              <p>• Acompanhamento nefrológico especializado</p>
              <p>• Preparação para terapia de substituição renal</p>
              <p>• Tratamento de complicações (anemia, distúrbios minerais)</p>
              <p>• Educação sobre opções de TRS</p>
            </>
          )}
          {eGFR < 15 && (
            <>
              <p>• Início de terapia de substituição renal</p>
              <p>• Hemodiálise, diálise peritoneal ou transplante</p>
              <p>• Cuidados paliativos se apropriado</p>
            </>
          )}
        </div>
      </motion.div>

      {/* Important Notes */}
      {(eGFR < 60 || isElderly) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-700">
            <strong>Nota:</strong>{" "}
            {isElderly && eGFR >= 45
              ? "Em idosos, eGFR entre 45-59 pode ser normal para a idade. Considere outros marcadores de lesão renal."
              : "Confirme com segunda dosagem em 3 meses. Considere causas reversíveis de redução da TFG."}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
