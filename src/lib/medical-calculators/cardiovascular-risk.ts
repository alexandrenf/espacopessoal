import {
  CardiovascularRiskInputs,
  CardiovascularRiskResult,
  RiskCategory,
  Sex,
} from "~/types/medical-calculators";
import {
  SBC_2020_CONFIG,
  AGGRAVATING_FACTORS,
  RISK_COLORS,
} from "./sbc-2020-config";
import { cardiovascularRiskValidation } from "./validation";

/**
 * Complete Cardiovascular Risk Calculator based on SBC 2020 Guidelines
 * Implements the full algorithm with automatic high-risk conditions,
 * Framingham score calculation, and aggravating factors reclassification
 */
export class CardiovascularRiskCalculator {
  private config = SBC_2020_CONFIG;

  /**
   * Main calculation method
   */
  calculate(inputs: CardiovascularRiskInputs): CardiovascularRiskResult {
    // Step 1: Validate inputs
    const validation = cardiovascularRiskValidation.validate(inputs);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    // Step 2: Check inclusion criteria
    const inclusionCheck = this.checkInclusionCriteria(inputs);
    if (!inclusionCheck.valid) {
      return {
        success: false,
        error: inclusionCheck.reason,
      };
    }

    // Step 3: Check automatic high-risk conditions
    const automaticHighRisk = this.checkAutomaticHighRiskConditions(inputs);
    if (automaticHighRisk.isHighRisk) {
      return {
        success: true,
        riskCategory: "alto",
        riskColor: RISK_COLORS.alto,
        automaticHighRisk: true,
        automaticHighRiskReason: automaticHighRisk.reason,
        therapeuticTargets: this.config.therapeuticTargets.alto,
        recommendations: this.generateRecommendations("alto", inputs),
      };
    }

    // Step 4: Calculate Framingham score
    const framinghamResult = this.calculateFraminghamScore(inputs);

    // Step 5: Determine initial risk category
    let riskCategory = this.classifyRisk(
      framinghamResult.riskPercentage,
      inputs.sex,
    );

    // Step 6: Check aggravating factors for intermediate risk
    const aggravatingFactors: string[] = [];
    let reclassified = false;

    if (riskCategory === "intermediário") {
      const aggravatingResult = this.checkAggravatingFactors(inputs);
      aggravatingFactors.push(...aggravatingResult.factors);

      if (aggravatingResult.factors.length > 0) {
        riskCategory = "alto";
        reclassified = true;
      }
    }

    // Step 7: Generate final result
    return {
      success: true,
      riskPercentage: framinghamResult.riskPercentage,
      riskCategory,
      riskColor: RISK_COLORS[riskCategory],
      framinghamScore: framinghamResult.betaScore,
      therapeuticTargets: this.config.therapeuticTargets[riskCategory],
      aggravatingFactors,
      reclassified,
      automaticHighRisk: false,
      recommendations: this.generateRecommendations(riskCategory, inputs),
    };
  }

  /**
   * Check if patient meets inclusion criteria
   */
  private checkInclusionCriteria(inputs: CardiovascularRiskInputs): {
    valid: boolean;
    reason?: string;
  } {
    const { age } = inputs;
    const { ageMin, ageMax } = this.config.inclusionCriteria;

    if (age < ageMin || age > ageMax) {
      return {
        valid: false,
        reason: `Idade fora dos critérios de inclusão (${ageMin}-${ageMax} anos)`,
      };
    }

    return { valid: true };
  }

  /**
   * Check for automatic high-risk conditions
   */
  private checkAutomaticHighRiskConditions(inputs: CardiovascularRiskInputs): {
    isHighRisk: boolean;
    reason?: string;
  } {
    const conditions: string[] = [];

    // Manifested atherosclerotic CVD
    if (inputs.manifestedCVD) {
      conditions.push("DCV aterosclerótica manifesta");
    }

    // Diabetes with additional risk factors (simplified check)
    if (
      inputs.diabetes &&
      (inputs.age >= 40 || inputs.familyHistory || inputs.metabolicSyndrome)
    ) {
      conditions.push("Diabetes com fatores de risco adicionais");
    }

    // Chronic kidney disease (would need eGFR < 60)
    if (inputs.chronicKidneyDisease) {
      conditions.push("DRC com TFG < 60 mL/min/1.73m²");
    }

    // Familial hypercholesterolemia
    if (inputs.familialHypercholesterolemia) {
      conditions.push("Hipercolesterolemia familiar");
    }

    // LDL cholesterol ≥ 190 mg/dL
    if (inputs.ldlCholesterol && inputs.ldlCholesterol >= 190) {
      conditions.push("LDL-c ≥ 190 mg/dL");
    }

    // Estimated LDL from total cholesterol (simplified Friedewald)
    if (
      !inputs.ldlCholesterol &&
      inputs.totalCholesterol &&
      inputs.hdlCholesterol
    ) {
      const estimatedLDL =
        inputs.totalCholesterol -
        inputs.hdlCholesterol -
        inputs.totalCholesterol * 0.2;
      if (estimatedLDL >= 190) {
        conditions.push("LDL-c estimado ≥ 190 mg/dL");
      }
    }

    return {
      isHighRisk: conditions.length > 0,
      reason: conditions.join(", "),
    };
  }

  /**
   * Calculate Framingham risk score
   */
  private calculateFraminghamScore(inputs: CardiovascularRiskInputs): {
    riskPercentage: number;
    betaScore: number;
  } {
    const {
      sex,
      age,
      totalCholesterol,
      hdlCholesterol,
      systolicBP,
      diabetes,
      smoking,
    } = inputs;

    const coefficients =
      this.config.framinghamCoefficients[sex === "M" ? "male" : "female"];
    const baselineSurvival =
      this.config.baselineSurvival[sex === "M" ? "male" : "female"];

    // Validate that all required coefficients are present
    const requiredCoefficients = [
      "age",
      "totalCholesterol",
      "hdlCholesterol",
      "systolicBP",
      "diabetes",
      "smoking",
    ];

    const missingCoefficients = requiredCoefficients.filter(
      (coeff) =>
        coefficients[coeff] === undefined || coefficients[coeff] === null,
    );

    if (missingCoefficients.length > 0) {
      throw new Error(
        `Missing required Framingham coefficients for ${sex === "M" ? "male" : "female"}: ${missingCoefficients.join(", ")}`,
      );
    }

    // Calculate beta score (linear predictor)
    // TypeScript assertions are safe here because we've validated all coefficients exist above
    const betaScore =
      coefficients.age! * age +
      coefficients.totalCholesterol! * totalCholesterol +
      coefficients.hdlCholesterol! * hdlCholesterol +
      coefficients.systolicBP! * systolicBP +
      (diabetes ? coefficients.diabetes! : 0) +
      (smoking ? coefficients.smoking! : 0);

    // Calculate risk percentage using Framingham formula
    const riskPercentage =
      (1 - Math.pow(baselineSurvival, Math.exp(betaScore))) * 100;

    return {
      riskPercentage: Math.max(0, Math.min(100, riskPercentage)), // Clamp between 0-100%
      betaScore,
    };
  }

  /**
   * Classify risk based on percentage and sex-specific thresholds
   */
  private classifyRisk(riskPercentage: number, sex: Sex): RiskCategory {
    const thresholds =
      this.config.riskThresholds[sex === "M" ? "male" : "female"];

    if (riskPercentage < thresholds.low) {
      return "baixo";
    } else if (riskPercentage < thresholds.intermediate) {
      return "intermediário";
    } else {
      return "alto";
    }
  }

  /**
   * Check for aggravating factors (only applies to intermediate risk)
   */
  private checkAggravatingFactors(inputs: CardiovascularRiskInputs): {
    factors: string[];
  } {
    const factors: string[] = [];

    // Family history of early CVD
    if (inputs.familyHistory) {
      factors.push(AGGRAVATING_FACTORS.familyHistory.description);
    }

    // Metabolic syndrome
    if (inputs.metabolicSyndrome) {
      factors.push(AGGRAVATING_FACTORS.metabolicSyndrome.description);
    }

    // Microalbuminuria
    if (inputs.microalbuminuria) {
      const { min, max } = AGGRAVATING_FACTORS.microalbuminuria.threshold;
      if (inputs.microalbuminuria >= min && inputs.microalbuminuria <= max) {
        factors.push(AGGRAVATING_FACTORS.microalbuminuria.description);
      }
    }

    // High-sensitivity CRP
    if (inputs.hsCRP && inputs.hsCRP >= AGGRAVATING_FACTORS.hsCRP.threshold) {
      factors.push(AGGRAVATING_FACTORS.hsCRP.description);
    }

    // Coronary calcium score
    if (
      inputs.coronaryCalciumScore &&
      inputs.coronaryCalciumScore >=
        AGGRAVATING_FACTORS.coronaryCalciumScore.threshold
    ) {
      factors.push(AGGRAVATING_FACTORS.coronaryCalciumScore.description);
    }

    return { factors };
  }

  /**
   * Generate personalized recommendations based on risk category
   */
  private generateRecommendations(
    riskCategory: RiskCategory,
    inputs: CardiovascularRiskInputs,
  ): string[] {
    const baseRecommendations =
      this.config.therapeuticTargets[riskCategory].additionalRecommendations ??
      [];
    const personalizedRecommendations: string[] = [...baseRecommendations];

    // Add specific recommendations based on risk factors
    if (inputs.diabetes) {
      personalizedRecommendations.push(
        "Controle rigoroso da glicemia (HbA1c < 7%)",
      );
    }

    if (inputs.smoking) {
      personalizedRecommendations.push(
        "Cessação do tabagismo (prioridade máxima)",
      );
    }

    if (inputs.metabolicSyndrome) {
      personalizedRecommendations.push("Tratamento da síndrome metabólica");
    }

    if (inputs.systolicBP >= 140) {
      personalizedRecommendations.push("Tratamento anti-hipertensivo");
    }

    // Risk category specific recommendations
    if (riskCategory === "alto") {
      personalizedRecommendations.push(
        "Considerar AAS 100mg/dia em prevenção primária",
      );
      personalizedRecommendations.push("Avaliação cardiológica especializada");
    }

    return personalizedRecommendations;
  }

  /**
   * Get detailed risk interpretation
   */
  getRiskInterpretation(result: CardiovascularRiskResult): string {
    if (!result.success || !result.riskCategory) return "";

    const interpretations = {
      baixo:
        "Risco baixo para eventos cardiovasculares em 10 anos. Manter estilo de vida saudável e reavaliação periódica.",
      intermediário:
        "Risco intermediário para eventos cardiovasculares em 10 anos. Considerar intervenções preventivas e avaliação de fatores agravantes.",
      alto: "Risco alto para eventos cardiovasculares em 10 anos. Intervenção terapêutica intensiva recomendada.",
    };

    return interpretations[result.riskCategory];
  }

  /**
   * Get algorithm explanation for educational purposes
   */
  getAlgorithmExplanation(): string[] {
    return [
      "1. Verificação dos critérios de inclusão (idade 40-74 anos, prevenção primária)",
      "2. Avaliação de condições de alto risco automático",
      "3. Cálculo do escore de Framingham adaptado para população brasileira",
      "4. Classificação inicial do risco com pontos de corte específicos por sexo",
      "5. Reclassificação do risco intermediário na presença de fatores agravantes",
      "6. Definição de metas terapêuticas e recomendações personalizadas",
    ];
  }
}

// Export singleton instance
export const cardiovascularRiskCalculator = new CardiovascularRiskCalculator();

// Export convenience function
export const calculateCardiovascularRisk = (
  inputs: CardiovascularRiskInputs,
): CardiovascularRiskResult => {
  return cardiovascularRiskCalculator.calculate(inputs);
};
