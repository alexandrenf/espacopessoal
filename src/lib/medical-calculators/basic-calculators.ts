import {
  IMCInputs,
  IMCResult,
  LDLInputs,
  LDLResult,
  CKDEPIInputs,
  CKDEPIResult,
  ObstetricInputs,
  ObstetricResult,
  Sex,
} from "~/types/medical-calculators";
import {
  imcValidation,
  ldlValidation,
  ckdEpiValidation,
  obstetricValidation,
} from "./validation";

/**
 * IMC (Body Mass Index) Calculator
 */
export class IMCCalculator {
  calculate(inputs: IMCInputs): IMCResult {
    const validation = imcValidation.validate(inputs);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    const { peso, altura } = inputs;
    const imc = peso / (altura * altura);

    let classificacao = "";
    let cor = "";

    if (imc < 18.5) {
      classificacao = "Baixo peso";
      cor = "text-blue-600";
    } else if (imc < 25) {
      classificacao = "Peso normal";
      cor = "text-green-600";
    } else if (imc < 30) {
      classificacao = "Sobrepeso";
      cor = "text-yellow-600";
    } else if (imc < 35) {
      classificacao = "Obesidade grau I";
      cor = "text-orange-600";
    } else if (imc < 40) {
      classificacao = "Obesidade grau II";
      cor = "text-red-600";
    } else {
      classificacao = "Obesidade grau III";
      cor = "text-red-800";
    }

    return {
      success: true,
      imc: Math.round(imc * 10) / 10,
      classificacao,
      cor,
      formula: `IMC = ${peso} ÷ (${altura})² = ${imc.toFixed(1)}`,
    };
  }
}

/**
 * LDL Cholesterol Calculator (Friedewald Formula)
 */
export class LDLCalculator {
  calculate(inputs: LDLInputs): LDLResult {
    const validation = ldlValidation.validate(inputs);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    const { colesterolTotal, hdl, triglicerideos } = inputs;

    // Check if Friedewald formula is valid
    if (triglicerideos >= 400) {
      return {
        success: false,
        error:
          "Fórmula de Friedewald não válida para TG ≥ 400 mg/dL. Use fórmula de Martin-Hopkins.",
        warnings: ["Considere dosagem direta de LDL ou fórmula alternativa"],
      };
    }

    const ldl = colesterolTotal - hdl - triglicerideos / 5;

    let classificacao = "";
    let cor = "";

    if (ldl < 100) {
      classificacao = "Ótimo";
      cor = "text-green-600";
    } else if (ldl < 130) {
      classificacao = "Desejável";
      cor = "text-blue-600";
    } else if (ldl < 160) {
      classificacao = "Limítrofe";
      cor = "text-yellow-600";
    } else if (ldl < 190) {
      classificacao = "Alto";
      cor = "text-orange-600";
    } else {
      classificacao = "Muito alto";
      cor = "text-red-600";
    }

    const warnings: string[] = [];
    if (triglicerideos > 300) {
      warnings.push(
        "Triglicerídeos elevados podem afetar a precisão do cálculo",
      );
    }

    return {
      success: true,
      ldl: Math.round(ldl * 10) / 10,
      classificacao,
      cor,
      formula: `LDL = ${colesterolTotal} - ${hdl} - (${triglicerideos}/5) = ${ldl.toFixed(1)}`,
      method: "friedewald",
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Martin-Hopkins formula for when TG >= 400 mg/dL
   * This is a simplified implementation - full formula requires more complex calculations
   */
  calculateMartinHopkins(inputs: LDLInputs): LDLResult {
    const { colesterolTotal, hdl, triglicerideos } = inputs;

    // Simplified Martin-Hopkins approximation
    // In practice, this would use a more complex lookup table
    const adjustmentFactor =
      triglicerideos < 400
        ? 5
        : triglicerideos < 800
          ? 6
          : triglicerideos < 1200
            ? 7
            : 8;

    const ldl = colesterolTotal - hdl - triglicerideos / adjustmentFactor;

    return {
      success: true,
      ldl: Math.round(ldl * 10) / 10,
      classificacao:
        ldl < 100
          ? "Ótimo"
          : ldl < 130
            ? "Desejável"
            : ldl < 160
              ? "Limítrofe"
              : ldl < 190
                ? "Alto"
                : "Muito alto",
      cor:
        ldl < 100
          ? "text-green-600"
          : ldl < 130
            ? "text-blue-600"
            : ldl < 160
              ? "text-yellow-600"
              : ldl < 190
                ? "text-orange-600"
                : "text-red-600",
      formula: `LDL = ${colesterolTotal} - ${hdl} - (${triglicerideos}/${adjustmentFactor}) = ${ldl.toFixed(1)}`,
      method: "martin-hopkins",
      warnings: ["Fórmula de Martin-Hopkins (aproximação simplificada)"],
    };
  }
}

/**
 * CKD-EPI 2021 Calculator (without race coefficient)
 */
export class CKDEPICalculator {
  calculate(inputs: CKDEPIInputs): CKDEPIResult {
    const validation = ckdEpiValidation.validate(inputs);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    const { creatinina, idade, sexo } = inputs;

    // CKD-EPI 2021 parameters
    const kappa = sexo === "F" ? 0.7 : 0.9;
    const alpha = sexo === "F" ? -0.241 : -0.302;
    const sexFactor = sexo === "F" ? 1.012 : 1.0;

    const scrKappa = creatinina / kappa;
    const min = Math.min(scrKappa, 1);
    const max = Math.max(scrKappa, 1);

    const eGFR =
      142 *
      Math.pow(min, alpha) *
      Math.pow(max, -1.2) *
      Math.pow(0.9938, idade) *
      sexFactor;

    let classificacao = "";
    let cor = "";
    let stage = 0;

    if (eGFR >= 90) {
      classificacao = "Normal ou alta";
      cor = "text-green-600";
      stage = 1;
    } else if (eGFR >= 60) {
      classificacao = "Levemente diminuída";
      cor = "text-yellow-600";
      stage = 2;
    } else if (eGFR >= 45) {
      classificacao = "Moderadamente diminuída";
      cor = "text-orange-600";
      stage = 3;
    } else if (eGFR >= 30) {
      classificacao = "Severamente diminuída";
      cor = "text-red-600";
      stage = 4;
    } else if (eGFR >= 15) {
      classificacao = "Falência renal";
      cor = "text-red-800";
      stage = 5;
    } else {
      classificacao = "Falência renal terminal";
      cor = "text-red-900";
      stage = 5;
    }

    const warnings: string[] = [];
    if (eGFR < 60) {
      warnings.push("TFG < 60: Considere avaliação nefrológica");
    }
    if (eGFR < 30) {
      warnings.push("TFG < 30: Preparação para terapia renal substitutiva");
    }

    return {
      success: true,
      eGFR: Math.round(eGFR * 10) / 10,
      classificacao,
      cor,
      stage,
      formula: "CKD-EPI 2021 (sem coeficiente racial)",
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Obstetric Calculator for gestational age calculations
 */
export class ObstetricCalculator {
  calculate(inputs: ObstetricInputs): ObstetricResult {
    const validation = obstetricValidation.validate(inputs);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    const { mode, currentDate } = inputs;

    switch (mode) {
      case "dum":
        return this.calculateFromDUM(inputs.dum!, currentDate);
      case "ultrasound":
        return this.calculateFromUltrasound(
          inputs.ultrasoundDate!,
          inputs.ultrasoundWeeks!,
          inputs.ultrasoundDays!,
          currentDate,
        );
      case "conception":
        return this.calculateFromConception(
          inputs.conceptionDate!,
          currentDate,
        );
      case "ivf":
        return this.calculateFromIVF(
          inputs.transferDate!,
          inputs.embryoAge!,
          currentDate,
        );
      default:
        return {
          success: false,
          error: "Método de cálculo inválido",
        };
    }
  }

  private calculateFromDUM(dum: string, currentDate: string): ObstetricResult {
    const dumDate = new Date(dum);
    const current = new Date(currentDate);
    const diffTime = current.getTime() - dumDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    const dpp = new Date(dumDate.getTime() + 280 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      weeks,
      days,
      totalDays: diffDays,
      dpp: dpp.toISOString().split("T")[0],
      gestationalAge: `${weeks}s${days}d`,
      effectiveDUM: dum,
      method: "DUM",
    };
  }

  private calculateFromUltrasound(
    ultrasoundDate: string,
    weeks: number,
    days: number,
    currentDate: string,
  ): ObstetricResult {
    const ultrasoundDateObj = new Date(ultrasoundDate);
    const gestDaysAtUltrasound = weeks * 7 + days;
    const effectiveDUMDate = new Date(
      ultrasoundDateObj.getTime() - gestDaysAtUltrasound * 24 * 60 * 60 * 1000,
    );
    const effectiveDUM = effectiveDUMDate.toISOString().split("T")[0]!;

    const result = this.calculateFromDUM(effectiveDUM, currentDate);
    return {
      ...result,
      effectiveDUM,
      method: "Ultrassom",
    };
  }

  private calculateFromConception(
    conceptionDate: string,
    currentDate: string,
  ): ObstetricResult {
    const conceptionDateObj = new Date(conceptionDate);
    const effectiveDUMDate = new Date(
      conceptionDateObj.getTime() - 14 * 24 * 60 * 60 * 1000,
    );
    const effectiveDUM = effectiveDUMDate.toISOString().split("T")[0]!;

    const result = this.calculateFromDUM(effectiveDUM, currentDate);
    return {
      ...result,
      effectiveDUM,
      method: "Concepção",
    };
  }

  private calculateFromIVF(
    transferDate: string,
    embryoAge: number,
    currentDate: string,
  ): ObstetricResult {
    const transferDateObj = new Date(transferDate);
    const effectiveDUMDate = new Date(
      transferDateObj.getTime() - (14 + embryoAge) * 24 * 60 * 60 * 1000,
    );
    const effectiveDUM = effectiveDUMDate.toISOString().split("T")[0]!;

    const result = this.calculateFromDUM(effectiveDUM, currentDate);
    return {
      ...result,
      effectiveDUM,
      method: "FIV",
    };
  }
}

// Export calculator instances
export const imcCalculator = new IMCCalculator();
export const ldlCalculator = new LDLCalculator();
export const ckdEpiCalculator = new CKDEPICalculator();
export const obstetricCalculator = new ObstetricCalculator();

// Export convenience functions
export const calculateIMC = (inputs: IMCInputs): IMCResult =>
  imcCalculator.calculate(inputs);
export const calculateLDL = (inputs: LDLInputs): LDLResult =>
  ldlCalculator.calculate(inputs);
export const calculateCKDEPI = (inputs: CKDEPIInputs): CKDEPIResult =>
  ckdEpiCalculator.calculate(inputs);
export const calculateObstetric = (inputs: ObstetricInputs): ObstetricResult =>
  obstetricCalculator.calculate(inputs);
