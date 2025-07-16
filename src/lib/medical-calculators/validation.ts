import {
  ValidationRule,
  CalculatorValidation,
} from "~/types/medical-calculators";
import { INPUT_VALIDATION_RANGES } from "./sbc-2020-config";

// Generic validation functions
export const createRangeValidator = (
  min: number,
  max: number,
  fieldName: string,
): ValidationRule => ({
  field: fieldName,
  type: "range",
  min,
  max,
  message: `${fieldName} deve estar entre ${min} e ${max}`,
});

export const createRequiredValidator = (fieldName: string): ValidationRule => ({
  field: fieldName,
  type: "required",
  message: `${fieldName} é obrigatório`,
});

export const createCustomValidator = (
  fieldName: string,
  validator: (value: unknown) => boolean,
  message: string,
): ValidationRule => ({
  field: fieldName,
  type: "custom",
  validator,
  message,
});

// IMC Validation
export const imcValidation: CalculatorValidation = {
  rules: [
    createRequiredValidator("peso"),
    createRequiredValidator("altura"),
    createRangeValidator(1, 500, "peso"),
    createRangeValidator(0.5, 2.5, "altura"),
  ],
  validate: (inputs: unknown) => {
    const data = inputs as { peso?: number; altura?: number };
    const errors: string[] = [];

    if (!data.peso) errors.push("Peso é obrigatório");
    else if (data.peso < 1 || data.peso > 500)
      errors.push("Peso deve estar entre 1 e 500 kg");

    if (!data.altura) errors.push("Altura é obrigatória");
    else if (data.altura < 0.5 || data.altura > 2.5)
      errors.push("Altura deve estar entre 0.5 e 2.5 m");

    return { isValid: errors.length === 0, errors };
  },
};

// LDL Validation
export const ldlValidation: CalculatorValidation = {
  rules: [
    createRequiredValidator("colesterolTotal"),
    createRequiredValidator("hdl"),
    createRequiredValidator("triglicerideos"),
    createRangeValidator(100, 500, "colesterolTotal"),
    createRangeValidator(20, 100, "hdl"),
    createRangeValidator(50, 1000, "triglicerideos"),
    createCustomValidator(
      "cholesterolRatio",
      (inputs: unknown) => {
        const data = inputs as { colesterolTotal?: number; hdl?: number };
        return (
          !data.colesterolTotal || !data.hdl || data.hdl < data.colesterolTotal
        );
      },
      "HDL deve ser menor que o colesterol total",
    ),
  ],
  validate: (inputs: unknown) => {
    const data = inputs as {
      colesterolTotal?: number;
      hdl?: number;
      triglicerideos?: number;
    };
    const errors: string[] = [];

    if (!data.colesterolTotal) errors.push("Colesterol total é obrigatório");
    else if (data.colesterolTotal < 100 || data.colesterolTotal > 500) {
      errors.push("Colesterol total deve estar entre 100 e 500 mg/dL");
    }

    if (!data.hdl) errors.push("HDL é obrigatório");
    else if (data.hdl < 20 || data.hdl > 100) {
      errors.push("HDL deve estar entre 20 e 100 mg/dL");
    }

    if (!data.triglicerideos) errors.push("Triglicerídeos são obrigatórios");
    else if (data.triglicerideos < 50 || data.triglicerideos > 1000) {
      errors.push("Triglicerídeos devem estar entre 50 e 1000 mg/dL");
    }

    // Cross-validation
    if (data.colesterolTotal && data.hdl && data.hdl >= data.colesterolTotal) {
      errors.push("HDL deve ser menor que o colesterol total");
    }

    if (data.triglicerideos && data.triglicerideos >= 400) {
      errors.push(
        "Fórmula de Friedewald não é válida para triglicerídeos ≥ 400 mg/dL",
      );
    }

    return { isValid: errors.length === 0, errors };
  },
};

// CKD-EPI Validation
export const ckdEpiValidation: CalculatorValidation = {
  rules: [
    createRequiredValidator("creatinina"),
    createRequiredValidator("idade"),
    createRequiredValidator("sexo"),
    createRangeValidator(0.3, 15, "creatinina"),
    createRangeValidator(18, 120, "idade"),
  ],
  validate: (inputs: unknown) => {
    const data = inputs as {
      creatinina?: number;
      idade?: number;
      sexo?: string;
    };
    const errors: string[] = [];

    if (!data.creatinina) errors.push("Creatinina é obrigatória");
    else if (data.creatinina < 0.3 || data.creatinina > 15) {
      errors.push("Creatinina deve estar entre 0.3 e 15 mg/dL");
    }

    if (!data.idade) errors.push("Idade é obrigatória");
    else if (data.idade < 18 || data.idade > 120) {
      errors.push("Idade deve estar entre 18 e 120 anos");
    }

    if (!data.sexo) errors.push("Sexo é obrigatório");
    else if (!["M", "F"].includes(data.sexo)) {
      errors.push("Sexo deve ser M ou F");
    }

    return { isValid: errors.length === 0, errors };
  },
};

// Obstetric Validation
export const obstetricValidation: CalculatorValidation = {
  rules: [
    createRequiredValidator("mode"),
    createRequiredValidator("currentDate"),
  ],
  validate: (inputs: unknown) => {
    const data = inputs as {
      mode?: string;
      currentDate?: string;
      dum?: string;
      ultrasoundDate?: string;
      ultrasoundWeeks?: number;
      ultrasoundDays?: number;
      conceptionDate?: string;
      transferDate?: string;
      embryoAge?: number;
    };
    const errors: string[] = [];

    if (!data.mode) errors.push("Método de cálculo é obrigatório");
    if (!data.currentDate) errors.push("Data atual é obrigatória");

    // Mode-specific validation
    switch (data.mode) {
      case "dum":
        if (!data.dum) errors.push("Data da última menstruação é obrigatória");
        break;
      case "ultrasound":
        if (!data.ultrasoundDate)
          errors.push("Data do ultrassom é obrigatória");
        if (!data.ultrasoundWeeks)
          errors.push("Semanas no ultrassom são obrigatórias");
        if (data.ultrasoundDays === undefined)
          errors.push("Dias no ultrassom são obrigatórios");
        if (
          data.ultrasoundWeeks &&
          (data.ultrasoundWeeks < 4 || data.ultrasoundWeeks > 42)
        ) {
          errors.push("Semanas devem estar entre 4 e 42");
        }
        if (
          data.ultrasoundDays !== undefined &&
          (data.ultrasoundDays < 0 || data.ultrasoundDays > 6)
        ) {
          errors.push("Dias devem estar entre 0 e 6");
        }
        break;
      case "conception":
        if (!data.conceptionDate)
          errors.push("Data da concepção é obrigatória");
        break;
      case "ivf":
        if (!data.transferDate)
          errors.push("Data da transferência é obrigatória");
        if (!data.embryoAge) errors.push("Idade do embrião é obrigatória");
        if (data.embryoAge && ![3, 5, 6].includes(data.embryoAge)) {
          errors.push("Idade do embrião deve ser 3, 5 ou 6 dias");
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  },
};

// Cardiovascular Risk Validation
export const cardiovascularRiskValidation: CalculatorValidation = {
  rules: [
    createRequiredValidator("age"),
    createRequiredValidator("sex"),
    createRequiredValidator("systolicBP"),
    createRequiredValidator("totalCholesterol"),
    createRequiredValidator("hdlCholesterol"),
    createRangeValidator(
      INPUT_VALIDATION_RANGES.age.min,
      INPUT_VALIDATION_RANGES.age.max,
      "age",
    ),
    createRangeValidator(
      INPUT_VALIDATION_RANGES.systolicBP.min,
      INPUT_VALIDATION_RANGES.systolicBP.max,
      "systolicBP",
    ),
    createRangeValidator(
      INPUT_VALIDATION_RANGES.totalCholesterol.min,
      INPUT_VALIDATION_RANGES.totalCholesterol.max,
      "totalCholesterol",
    ),
    createRangeValidator(
      INPUT_VALIDATION_RANGES.hdlCholesterol.min,
      INPUT_VALIDATION_RANGES.hdlCholesterol.max,
      "hdlCholesterol",
    ),
  ],
  validate: (inputs: unknown) => {
    const data = inputs as {
      age?: number;
      sex?: string;
      systolicBP?: number;
      totalCholesterol?: number;
      hdlCholesterol?: number;
      microalbuminuria?: number;
      hsCRP?: number;
      coronaryCalciumScore?: number;
    };
    const errors: string[] = [];

    // Required fields
    if (!data.age) errors.push("Idade é obrigatória");
    else if (
      data.age < INPUT_VALIDATION_RANGES.age.min ||
      data.age > INPUT_VALIDATION_RANGES.age.max
    ) {
      errors.push(
        `Idade deve estar entre ${INPUT_VALIDATION_RANGES.age.min} e ${INPUT_VALIDATION_RANGES.age.max} anos`,
      );
    }

    if (!data.sex) errors.push("Sexo é obrigatório");
    else if (!["M", "F"].includes(data.sex)) {
      errors.push("Sexo deve ser M ou F");
    }

    if (!data.systolicBP) errors.push("Pressão sistólica é obrigatória");
    else if (
      data.systolicBP < INPUT_VALIDATION_RANGES.systolicBP.min ||
      data.systolicBP > INPUT_VALIDATION_RANGES.systolicBP.max
    ) {
      errors.push(
        `Pressão sistólica deve estar entre ${INPUT_VALIDATION_RANGES.systolicBP.min} e ${INPUT_VALIDATION_RANGES.systolicBP.max} mmHg`,
      );
    }

    if (!data.totalCholesterol) errors.push("Colesterol total é obrigatório");
    else if (
      data.totalCholesterol < INPUT_VALIDATION_RANGES.totalCholesterol.min ||
      data.totalCholesterol > INPUT_VALIDATION_RANGES.totalCholesterol.max
    ) {
      errors.push(
        `Colesterol total deve estar entre ${INPUT_VALIDATION_RANGES.totalCholesterol.min} e ${INPUT_VALIDATION_RANGES.totalCholesterol.max} mg/dL`,
      );
    }

    if (!data.hdlCholesterol) errors.push("HDL é obrigatório");
    else if (
      data.hdlCholesterol < INPUT_VALIDATION_RANGES.hdlCholesterol.min ||
      data.hdlCholesterol > INPUT_VALIDATION_RANGES.hdlCholesterol.max
    ) {
      errors.push(
        `HDL deve estar entre ${INPUT_VALIDATION_RANGES.hdlCholesterol.min} e ${INPUT_VALIDATION_RANGES.hdlCholesterol.max} mg/dL`,
      );
    }

    // Optional fields validation
    if (data.microalbuminuria !== undefined) {
      if (
        data.microalbuminuria < INPUT_VALIDATION_RANGES.microalbuminuria.min ||
        data.microalbuminuria > INPUT_VALIDATION_RANGES.microalbuminuria.max
      ) {
        errors.push(
          `Microalbuminúria deve estar entre ${INPUT_VALIDATION_RANGES.microalbuminuria.min} e ${INPUT_VALIDATION_RANGES.microalbuminuria.max} mg/g`,
        );
      }
    }

    if (data.hsCRP !== undefined) {
      if (
        data.hsCRP < INPUT_VALIDATION_RANGES.hsCRP.min ||
        data.hsCRP > INPUT_VALIDATION_RANGES.hsCRP.max
      ) {
        errors.push(
          `PCR-us deve estar entre ${INPUT_VALIDATION_RANGES.hsCRP.min} e ${INPUT_VALIDATION_RANGES.hsCRP.max} mg/L`,
        );
      }
    }

    if (data.coronaryCalciumScore !== undefined) {
      if (
        data.coronaryCalciumScore <
          INPUT_VALIDATION_RANGES.coronaryCalciumScore.min ||
        data.coronaryCalciumScore >
          INPUT_VALIDATION_RANGES.coronaryCalciumScore.max
      ) {
        errors.push(
          `Escore de cálcio deve estar entre ${INPUT_VALIDATION_RANGES.coronaryCalciumScore.min} e ${INPUT_VALIDATION_RANGES.coronaryCalciumScore.max}`,
        );
      }
    }

    // Cross-validation
    if (
      data.totalCholesterol &&
      data.hdlCholesterol &&
      data.hdlCholesterol >= data.totalCholesterol
    ) {
      errors.push("HDL deve ser menor que o colesterol total");
    }

    return { isValid: errors.length === 0, errors };
  },
};

// Export all validations
export const validations = {
  imc: imcValidation,
  ldl: ldlValidation,
  "ckd-epi": ckdEpiValidation,
  "idade-gestacional": obstetricValidation,
  "risco-cardiovascular": cardiovascularRiskValidation,
};
