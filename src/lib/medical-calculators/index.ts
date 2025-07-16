// Medical Calculators Library - Main Export File
import React from "react";

// Types
export * from "~/types/medical-calculators";

// Configuration
export {
  SBC_2020_CONFIG,
  AGGRAVATING_FACTORS,
  RISK_COLORS,
} from "./sbc-2020-config";

// Validation
export { validations } from "./validation";

// Calculator Implementations
export {
  imcCalculator,
  ldlCalculator,
  ckdEpiCalculator,
  obstetricCalculator,
  calculateIMC,
  calculateLDL,
  calculateCKDEPI,
  calculateObstetric,
} from "./basic-calculators";

export {
  cardiovascularRiskCalculator,
  calculateCardiovascularRisk,
} from "./cardiovascular-risk";

// Calculator Registry
import {
  Calculator,
  Heart,
  Activity,
  Baby,
  Shield,
  TrendingUp,
} from "lucide-react";
import { CalculatorInfo } from "~/types/medical-calculators";

export const CALCULATOR_REGISTRY: CalculatorInfo[] = [
  {
    id: "imc",
    title: "Calculadora de IMC",
    description: "Índice de Massa Corporal para avaliação antropométrica",
    formula: "IMC = Peso (kg) / (Altura (m))²",
    icon: React.createElement(TrendingUp, { className: "h-6 w-6" }),
    category: "Antropometria",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    popularity: "Muito Popular",
    estimatedTime: "1 min",
    version: "1.0",
    references: [
      "WHO. Physical status: the use and interpretation of anthropometry. Geneva: World Health Organization; 1995.",
    ],
  },
  {
    id: "ldl",
    title: "Cálculo de LDL (Friedewald)",
    description: "Cálculo do LDL-colesterol pela fórmula de Friedewald",
    formula: "LDL = Colesterol Total - HDL - (Triglicerídeos / 5)",
    limitations: "Válido apenas para TG < 400 mg/dL",
    icon: React.createElement(Heart, { className: "h-6 w-6" }),
    category: "Cardiologia",
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    popularity: "Popular",
    estimatedTime: "2 min",
    version: "1.0",
    references: [
      "Friedewald WT, Levy RI, Fredrickson DS. Estimation of the concentration of low-density lipoprotein cholesterol in plasma. Clin Chem. 1972;18(6):499-502.",
    ],
  },
  {
    id: "ckd-epi",
    title: "CKD-EPI 2021 (TFG)",
    description:
      "Taxa de Filtração Glomerular Estimada - versão 2021 sem coeficiente racial",
    formula:
      "eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^idade × 1.012 (se mulher)",
    details:
      "κ = 0.7 (mulheres) ou 0.9 (homens); α = -0.241 (mulheres) ou -0.302 (homens)",
    icon: React.createElement(Activity, { className: "h-6 w-6" }),
    category: "Nefrologia",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    popularity: "Atualizada",
    estimatedTime: "3 min",
    version: "2021",
    lastUpdated: "2021",
    references: [
      "Inker LA, Eneanya ND, Coresh J, et al. New Creatinine- and Cystatin C-Based Equations to Estimate GFR without Race. N Engl J Med. 2021;385(19):1737-1749.",
    ],
  },
  {
    id: "idade-gestacional",
    title: "Cálculos Obstétricos",
    description: "Idade Gestacional, DUM, DPP - múltiplos métodos de cálculo",
    formula: "IG = (Data atual - DUM) / 7; DPP = DUM + 280 dias",
    details: "Inclui correção por ultrassom e conversões entre métodos",
    icon: React.createElement(Baby, { className: "h-6 w-6" }),
    category: "Obstetrícia",
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    popularity: "Completo",
    estimatedTime: "2 min",
    version: "1.0",
    references: [
      "Committee on Obstetric Practice. Methods for estimating the due date. Obstet Gynecol. 2017;129(5):e150-e154.",
    ],
  },
  {
    id: "risco-cardiovascular",
    title: "Risco Cardiovascular (SBC)",
    description:
      "Calculadora de risco cardiovascular baseada no escore de Framingham adaptado para população brasileira",
    formula: "Risco = 1 - S₀^exp(β)",
    details: "Diretrizes da Sociedade Brasileira de Cardiologia 2020",
    icon: React.createElement(Shield, { className: "h-6 w-6" }),
    category: "Cardiologia",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    popularity: "Recomendado",
    estimatedTime: "5 min",
    version: "2020",
    lastUpdated: "2020",
    references: [
      "Sociedade Brasileira de Cardiologia. Atualização da Diretriz de Prevenção Cardiovascular da Sociedade Brasileira de Cardiologia - 2019. Arq Bras Cardiol. 2019;113(4):787-891.",
      "Précoma DB, Oliveira GMM, Simão AF, et al. Updated Cardiovascular Prevention Guideline of the Brazilian Society of Cardiology - 2019. Arq Bras Cardiol. 2019;113(4):787-891.",
    ],
  },
];

// Utility functions
export const getCalculatorById = (id: string): CalculatorInfo | undefined => {
  return CALCULATOR_REGISTRY.find((calc) => calc.id === id);
};

export const getCalculatorsByCategory = (
  category: string,
): CalculatorInfo[] => {
  return CALCULATOR_REGISTRY.filter((calc) => calc.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(CALCULATOR_REGISTRY.map((calc) => calc.category))];
};

// Calculator factory function
export const createCalculator = async (id: string) => {
  switch (id) {
    case "imc": {
      const { imcCalculator } = await import("./basic-calculators");
      return imcCalculator;
    }
    case "ldl": {
      const { ldlCalculator } = await import("./basic-calculators");
      return ldlCalculator;
    }
    case "ckd-epi": {
      const { ckdEpiCalculator } = await import("./basic-calculators");
      return ckdEpiCalculator;
    }
    case "idade-gestacional": {
      const { obstetricCalculator } = await import("./basic-calculators");
      return obstetricCalculator;
    }
    case "risco-cardiovascular": {
      const { cardiovascularRiskCalculator } = await import(
        "./cardiovascular-risk"
      );
      return cardiovascularRiskCalculator;
    }
    default:
      throw new Error(`Calculator with id "${id}" not found`);
  }
};

// Validation factory function
export const getValidation = async (id: string) => {
  const { validations } = await import("./validation");
  return validations[id as keyof typeof validations];
};

// Medical formulas reference
export const MEDICAL_FORMULAS = {
  imc: {
    formula: "IMC = Peso (kg) / (Altura (m))²",
    interpretation: {
      "< 18.5": "Abaixo do peso",
      "18.5 - 24.9": "Peso normal",
      "25.0 - 29.9": "Sobrepeso",
      "30.0 - 34.9": "Obesidade grau I",
      "35.0 - 39.9": "Obesidade grau II",
      "≥ 40.0": "Obesidade grau III",
    },
  },
  ldl: {
    formula: "LDL = Colesterol Total - HDL - (Triglicerídeos / 5)",
    limitations: [
      "Válido apenas para TG < 400 mg/dL",
      "Jejum de 12 horas recomendado",
    ],
    interpretation: {
      "< 100": "Ótimo",
      "100 - 129": "Desejável",
      "130 - 159": "Limítrofe",
      "160 - 189": "Alto",
      "≥ 190": "Muito alto",
    },
  },
  ckdEpi: {
    formula:
      "eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^idade × 1.012 (se mulher)",
    parameters: {
      κ: "0.7 (mulheres) ou 0.9 (homens)",
      α: "-0.241 (mulheres) ou -0.302 (homens)",
    },
    interpretation: {
      "≥ 90": "Normal ou alta (Estágio 1)",
      "60 - 89": "Levemente diminuída (Estágio 2)",
      "45 - 59": "Moderadamente diminuída (Estágio 3a)",
      "30 - 44": "Moderadamente diminuída (Estágio 3b)",
      "15 - 29": "Severamente diminuída (Estágio 4)",
      "< 15": "Falência renal (Estágio 5)",
    },
  },
  cardiovascularRisk: {
    formula: "Risco = 1 - S₀^exp(β), onde β = Σ(coeficiente × variável)",
    thresholds: {
      male: { low: "< 10%", intermediate: "10-20%", high: "≥ 20%" },
      female: { low: "< 5%", intermediate: "5-10%", high: "≥ 10%" },
    },
    aggravatingFactors: [
      "História familiar precoce de DCV",
      "Síndrome metabólica",
      "Microalbuminúria (30-300 mg/g)",
      "PCR-us ≥ 3 mg/L",
      "Escore de cálcio coronário ≥ 100",
    ],
  },
};
