// Medical Calculator Types and Interfaces

export type Sex = "M" | "F";
export type RiskCategory = "baixo" | "intermediário" | "alto";

// Base Calculator Interface
export interface CalculatorResult {
  success: boolean;
  error?: string;
  warnings?: string[];
}

// IMC Calculator
export interface IMCInputs {
  peso: number;
  altura: number;
}

export interface IMCResult extends CalculatorResult {
  imc?: number;
  classificacao?: string;
  cor?: string;
  formula?: string;
}

// LDL Calculator
export interface LDLInputs {
  colesterolTotal: number;
  hdl: number;
  triglicerideos: number;
}

export interface LDLResult extends CalculatorResult {
  ldl?: number;
  classificacao?: string;
  cor?: string;
  formula?: string;
  method?: "friedewald" | "martin-hopkins";
}

// CKD-EPI Calculator
export interface CKDEPIInputs {
  creatinina: number;
  idade: number;
  sexo: Sex;
}

export interface CKDEPIResult extends CalculatorResult {
  eGFR?: number;
  classificacao?: string;
  cor?: string;
  formula?: string;
  stage?: number;
}

// Obstetric Calculator
export type GestationalMode = "dum" | "ultrasound" | "conception" | "ivf";

export interface ObstetricInputs {
  mode: GestationalMode;
  currentDate: string;
  dum?: string;
  ultrasoundDate?: string;
  ultrasoundWeeks?: number;
  ultrasoundDays?: number;
  conceptionDate?: string;
  transferDate?: string;
  embryoAge?: number;
}

export interface ObstetricResult extends CalculatorResult {
  weeks?: number;
  days?: number;
  totalDays?: number;
  dpp?: string;
  gestationalAge?: string;
  effectiveDUM?: string;
  method?: string;
}

// Cardiovascular Risk Calculator - Based on SBC 2020
export interface CardiovascularRiskInputs {
  // Required variables
  age: number;
  sex: Sex;
  systolicBP: number;
  totalCholesterol: number;
  hdlCholesterol: number;
  diabetes: boolean;
  smoking: boolean;

  // Optional aggravating factors
  familyHistory?: boolean;
  metabolicSyndrome?: boolean;
  microalbuminuria?: number;
  hsCRP?: number;
  coronaryCalciumScore?: number;

  // Additional risk conditions
  ldlCholesterol?: number;
  chronicKidneyDisease?: boolean;
  familialHypercholesterolemia?: boolean;
  manifestedCVD?: boolean;
}

export interface TherapeuticTargets {
  ldl: string;
  bloodPressure: string;
  followUp: string;
  additionalRecommendations?: string[];
}

export interface CardiovascularRiskResult extends CalculatorResult {
  riskPercentage?: number;
  riskCategory?: RiskCategory;
  riskColor?: string;
  therapeuticTargets?: TherapeuticTargets;
  aggravatingFactors?: string[];
  reclassified?: boolean;
  automaticHighRisk?: boolean;
  automaticHighRiskReason?: string;
  framinghamScore?: number;
  recommendations?: string[];
}

// SBC 2020 Configuration
export interface SBCRiskConfig {
  version: string;
  source: string;
  targetPopulation: string;

  inclusionCriteria: {
    ageMin: number;
    ageMax: number;
    preventionType: string;
    excludeHighRiskConditions: boolean;
  };

  automaticHighRiskConditions: string[];

  framinghamCoefficients: {
    male: Record<string, number>;
    female: Record<string, number>;
  };

  baselineSurvival: {
    male: number;
    female: number;
  };

  riskThresholds: {
    male: { low: number; intermediate: number };
    female: { low: number; intermediate: number };
  };

  therapeuticTargets: Record<RiskCategory, TherapeuticTargets>;
}

// Calculator Registry
export interface CalculatorInfo {
  id: string;
  title: string;
  description: string;
  formula: string;
  details?: string;
  limitations?: string;
  icon: React.ReactNode;
  category: string;
  color: string;
  bgColor: string;
  borderColor: string;
  popularity: string;
  estimatedTime: string;
  version?: string;
  lastUpdated?: string;
  references?: string[];
}

// Validation Rules
export interface ValidationRule {
  field: string;
  type: "required" | "range" | "custom";
  min?: number;
  max?: number;
  message: string;
  validator?: (value: unknown) => boolean;
}

export interface CalculatorValidation {
  rules: ValidationRule[];
  validate: (inputs: unknown) => { isValid: boolean; errors: string[] };
}

// Export/Report Types
export interface CalculationReport {
  id: string;
  calculatorType: string;
  timestamp: Date;
  inputs: unknown;
  result: unknown;
  patientInfo?: {
    name?: string;
    age?: number;
    sex?: Sex;
    medicalRecordNumber?: string;
  };
  clinicianInfo?: {
    name?: string;
    license?: string;
    institution?: string;
  };
  notes?: string;
}

export interface ExportOptions {
  format: "pdf" | "json" | "csv";
  includeFormulas: boolean;
  includeReferences: boolean;
  includeTimestamp: boolean;
  template?: string;
}
