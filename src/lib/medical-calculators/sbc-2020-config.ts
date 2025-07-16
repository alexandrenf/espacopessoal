import { SBCRiskConfig } from "~/types/medical-calculators";

export const SBC_2020_CONFIG: SBCRiskConfig = {
  version: "2020",
  source: "Sociedade Brasileira de Cardiologia",
  targetPopulation: "Brazilian",
  
  inclusionCriteria: {
    ageMin: 40,
    ageMax: 74,
    preventionType: "primary",
    excludeHighRiskConditions: true,
  },
  
  automaticHighRiskConditions: [
    "manifested_atherosclerotic_cvd",
    "diabetes_with_additional_risk_factors", 
    "chronic_kidney_disease_gfr_less_than_60",
    "familial_hypercholesterolemia",
    "ldl_cholesterol_greater_equal_190"
  ],
  
  framinghamCoefficients: {
    male: {
      age: 0.04826,
      totalCholesterol: 0.00013,
      hdlCholesterol: -0.00881,
      systolicBP: 0.00018,
      diabetes: 0.42839,
      smoking: 0.52873,
    },
    female: {
      age: 0.33766,
      totalCholesterol: 0.00013,
      hdlCholesterol: -0.00881,
      systolicBP: 0.00018,
      diabetes: 0.59626,
      smoking: 0.29246,
    },
  },
  
  baselineSurvival: {
    male: 0.88936,
    female: 0.95012,
  },
  
  riskThresholds: {
    male: {
      low: 10,
      intermediate: 20,
    },
    female: {
      low: 5,
      intermediate: 10,
    },
  },
  
  therapeuticTargets: {
    baixo: {
      ldl: "< 130 mg/dL",
      bloodPressure: "< 140/90 mmHg",
      followUp: "5 anos",
      additionalRecommendations: [
        "Mudanças no estilo de vida",
        "Atividade física regular",
        "Dieta saudável",
        "Controle do peso"
      ],
    },
    intermediário: {
      ldl: "< 100 mg/dL",
      bloodPressure: "< 130/80 mmHg", 
      followUp: "2 anos",
      additionalRecommendations: [
        "Considerar estatina se LDL acima da meta",
        "Mudanças intensivas no estilo de vida",
        "Controle rigoroso da pressão arterial",
        "Avaliação de fatores agravantes"
      ],
    },
    alto: {
      ldl: "< 70 mg/dL (< 50 mg/dL se muito alto risco)",
      bloodPressure: "< 130/80 mmHg",
      followUp: "1 ano",
      additionalRecommendations: [
        "Estatina obrigatória",
        "Considerar ezetimiba se meta não atingida",
        "Anti-hipertensivo + mudanças no estilo de vida",
        "Controle rigoroso de todos os fatores de risco",
        "Considerar AAS em prevenção primária"
      ],
    },
  },
};

// Aggravating factors configuration
export const AGGRAVATING_FACTORS = {
  familyHistory: {
    criteria: "first_degree_relative",
    ageCutoff: { male: 55, female: 65 },
    description: "História familiar precoce de DCV (parente de 1º grau: homem < 55 anos ou mulher < 65 anos)",
  },
  metabolicSyndrome: {
    criteria: "standard_definition",
    description: "Síndrome metabólica (definição padrão)",
  },
  microalbuminuria: {
    threshold: { min: 30, max: 300 },
    unit: "mg/g_creatinine",
    description: "Microalbuminúria (30-300 mg/g creatinina)",
  },
  hsCRP: {
    threshold: 3,
    unit: "mg/L",
    description: "PCR ultrassensível ≥ 3 mg/L",
  },
  coronaryCalciumScore: {
    threshold: 100,
    percentileThreshold: 75,
    description: "Escore de cálcio coronário ≥ 100 ou ≥ percentil 75",
  },
};

// Validation ranges for inputs
export const INPUT_VALIDATION_RANGES = {
  age: { min: 40, max: 74, unit: "years" },
  systolicBP: { min: 80, max: 250, unit: "mmHg" },
  totalCholesterol: { min: 100, max: 500, unit: "mg/dL" },
  hdlCholesterol: { min: 20, max: 100, unit: "mg/dL" },
  microalbuminuria: { min: 30, max: 300, unit: "mg/g_creatinine" },
  hsCRP: { min: 0, max: 50, unit: "mg/L" },
  coronaryCalciumScore: { min: 0, max: 5000, unit: "Agatston units" },
};

// Risk category colors for UI
export const RISK_COLORS = {
  baixo: "text-green-600",
  intermediário: "text-yellow-600", 
  alto: "text-red-600",
};

// Algorithm implementation notes
export const ALGORITHM_NOTES = {
  mainFlow: [
    "1. Verificar critérios de inclusão (idade 40-74 anos)",
    "2. Verificar condições de alto risco automático",
    "3. Calcular escore de Framingham se não houver alto risco automático",
    "4. Aplicar pontos de corte específicos por sexo",
    "5. Se risco intermediário, verificar fatores agravantes",
    "6. Reclassificar para alto risco se fatores agravantes presentes",
    "7. Definir metas terapêuticas e seguimento"
  ],
  framinghamFormula: "Risco = 1 - S₀^exp(β), onde β = Σ(coeficiente × variável)",
  reclassificationLogic: "Aplica-se apenas ao risco intermediário na presença de qualquer fator agravante",
};