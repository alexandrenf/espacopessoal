"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components_new/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Calculator,
  Heart,
  Activity,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import { CardiovascularRiskCalculator } from "~/lib/medical-calculators/cardiovascular-risk";
import { CardiovascularRiskGauge } from "~/components/calculators/indicators/CardiovascularRiskGauge";

interface CardiovascularRiskCalculatorFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (hasResult: boolean) => void;
  isCalculating: boolean;
}

interface CardiovascularRiskResult {
  success: boolean;
  framinghamScore: number;
  riskPercentage: number;
  riskCategory: string;
  recommendations: string[];
  hasHighRiskConditions: boolean;
  highRiskConditions: string[];
  aggravatingFactors: string[];
  reclassification?: string;
}

export function CardiovascularRiskCalculatorForm({
  onCalculationStart,
  onCalculationComplete,
  isCalculating,
}: CardiovascularRiskCalculatorFormProps) {
  // Basic inputs
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [systolicBP, setSystolicBP] = useState("");
  const [totalCholesterol, setTotalCholesterol] = useState("");
  const [hdlCholesterol, setHdlCholesterol] = useState("");

  // Risk factors
  const [diabetes, setDiabetes] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [hypertensionTreatment, setHypertensionTreatment] = useState(false);

  // Optional factors
  const [familyHistory, setFamilyHistory] = useState(false);
  const [microalbuminuria, setMicroalbuminuria] = useState("");
  const [hsCRP, setHsCRP] = useState("");
  const [coronaryCalciumScore, setCoronaryCalciumScore] = useState("");

  const [result, setResult] = useState<CardiovascularRiskResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const calculator = new CardiovascularRiskCalculator();

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (touched.age && age) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 30 || ageNum > 74) {
        newErrors.age = "Idade deve estar entre 30 e 74 anos";
      }
    }

    if (touched.systolicBP && systolicBP) {
      const bpNum = parseInt(systolicBP);
      if (isNaN(bpNum) || bpNum < 90 || bpNum > 200) {
        newErrors.systolicBP =
          "Pressão sistólica deve estar entre 90 e 200 mmHg";
      }
    }

    if (touched.totalCholesterol && totalCholesterol) {
      const cholNum = parseInt(totalCholesterol);
      if (isNaN(cholNum) || cholNum < 130 || cholNum > 320) {
        newErrors.totalCholesterol =
          "Colesterol total deve estar entre 130 e 320 mg/dL";
      }
    }

    if (touched.hdlCholesterol && hdlCholesterol) {
      const hdlNum = parseInt(hdlCholesterol);
      if (isNaN(hdlNum) || hdlNum < 20 || hdlNum > 100) {
        newErrors.hdlCholesterol = "HDL deve estar entre 20 e 100 mg/dL";
      }
    }

    // Cross-validation
    if (
      totalCholesterol &&
      hdlCholesterol &&
      touched.totalCholesterol &&
      touched.hdlCholesterol
    ) {
      const totalNum = parseInt(totalCholesterol);
      const hdlNum = parseInt(hdlCholesterol);
      if (!isNaN(totalNum) && !isNaN(hdlNum) && hdlNum >= totalNum) {
        newErrors.hdlCholesterol = "HDL deve ser menor que o colesterol total";
      }
    }

    setErrors(newErrors);
  }, [age, systolicBP, totalCholesterol, hdlCholesterol, touched]);

  const handleInputChange = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    switch (field) {
      case "age":
        setAge(value);
        break;
      case "systolicBP":
        setSystolicBP(value);
        break;
      case "totalCholesterol":
        setTotalCholesterol(value);
        break;
      case "hdlCholesterol":
        setHdlCholesterol(value);
        break;
      case "microalbuminuria":
        setMicroalbuminuria(value);
        break;
      case "hsCRP":
        setHsCRP(value);
        break;
      case "coronaryCalciumScore":
        setCoronaryCalciumScore(value);
        break;
    }
  };

  const handleCalculate = async () => {
    onCalculationStart();

    // Validate all required inputs
    const allTouched = {
      age: true,
      sex: true,
      systolicBP: true,
      totalCholesterol: true,
      hdlCholesterol: true,
    };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {};

    if (!age) newErrors.age = "Idade é obrigatória";
    if (!sex) newErrors.sex = "Sexo é obrigatório";
    if (!systolicBP) newErrors.systolicBP = "Pressão sistólica é obrigatória";
    if (!totalCholesterol)
      newErrors.totalCholesterol = "Colesterol total é obrigatório";
    if (!hdlCholesterol) newErrors.hdlCholesterol = "HDL é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onCalculationComplete(false);
      return;
    }

    try {
      // Simulate calculation delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const inputs = {
        age: parseInt(age),
        sex: sex as "M" | "F",
        systolicBP: parseInt(systolicBP),
        totalCholesterol: parseInt(totalCholesterol),
        hdlCholesterol: parseInt(hdlCholesterol),
        diabetes,
        smoking,
        hypertensionTreatment,
        familyHistory,
        microalbuminuria: microalbuminuria
          ? parseFloat(microalbuminuria)
          : undefined,
        hsCRP: hsCRP ? parseFloat(hsCRP) : undefined,
        coronaryCalciumScore: coronaryCalciumScore
          ? parseInt(coronaryCalciumScore)
          : undefined,
      };

      const calculationResult = calculator.calculate(inputs);

      if (calculationResult.success) {
        const enhancedResult: CardiovascularRiskResult = {
          success: true,
          framinghamScore: calculationResult.framinghamScore!,
          riskPercentage: calculationResult.riskPercentage!,
          riskCategory: calculationResult.riskCategory!,
          recommendations: calculationResult.recommendations!,
          hasHighRiskConditions: calculationResult.automaticHighRisk!,
          highRiskConditions: calculationResult.automaticHighRiskReason
            ? [calculationResult.automaticHighRiskReason]
            : [],
          aggravatingFactors: calculationResult.aggravatingFactors!,
          reclassification: calculationResult.reclassified
            ? "Risco reclassificado de intermediário para alto devido a fatores agravantes"
            : undefined,
        };

        setResult(enhancedResult);
        onCalculationComplete(true);
      } else {
        setErrors({ general: calculationResult.error ?? "Erro no cálculo" });
        onCalculationComplete(false);
      }
    } catch (error) {
      setErrors({ general: "Erro inesperado no cálculo" });
      onCalculationComplete(false);
    }
  };

  const getRiskColor = (category: string) => {
    const colorMap: Record<string, string> = {
      Baixo: "text-green-600 bg-green-50 border-green-200",
      Intermediário: "text-yellow-600 bg-yellow-50 border-yellow-200",
      Alto: "text-red-600 bg-red-50 border-red-200",
      "Muito Alto": "text-red-800 bg-red-100 border-red-300",
    };
    return colorMap[category] ?? "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getRiskIcon = (category: string) => {
    if (category === "Baixo") return <Shield className="h-5 w-5" />;
    if (category === "Intermediário") return <Target className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  const canCalculate =
    age &&
    sex &&
    systolicBP &&
    totalCholesterol &&
    hdlCholesterol &&
    Object.keys(errors).length === 0;

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Dados Básicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Age Input */}
            <div className="space-y-2">
              <Label htmlFor="age">Idade (anos)</Label>
              <Input
                id="age"
                type="number"
                placeholder="Ex: 45"
                value={age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                className={
                  errors.age ? "border-red-500 focus:border-red-500" : ""
                }
                min="30"
                max="74"
              />
              {errors.age && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.age}
                </p>
              )}
            </div>

            {/* Sex Select */}
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select
                value={sex}
                onValueChange={(value: "M" | "F") => {
                  setSex(value);
                  setTouched((prev) => ({ ...prev, sex: true }));
                }}
              >
                <SelectTrigger
                  className={
                    errors.sex ? "border-red-500 focus:border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="Selecione o sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
              {errors.sex && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.sex}
                </p>
              )}
            </div>

            {/* Systolic BP Input */}
            <div className="space-y-2">
              <Label htmlFor="systolicBP">Pressão Sistólica (mmHg)</Label>
              <Input
                id="systolicBP"
                type="number"
                placeholder="Ex: 140"
                value={systolicBP}
                onChange={(e) =>
                  handleInputChange("systolicBP", e.target.value)
                }
                className={
                  errors.systolicBP ? "border-red-500 focus:border-red-500" : ""
                }
                min="90"
                max="200"
              />
              {errors.systolicBP && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.systolicBP}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Total Cholesterol Input */}
            <div className="space-y-2">
              <Label htmlFor="totalCholesterol">Colesterol Total (mg/dL)</Label>
              <Input
                id="totalCholesterol"
                type="number"
                placeholder="Ex: 200"
                value={totalCholesterol}
                onChange={(e) =>
                  handleInputChange("totalCholesterol", e.target.value)
                }
                className={
                  errors.totalCholesterol
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
                min="130"
                max="320"
              />
              {errors.totalCholesterol && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.totalCholesterol}
                </p>
              )}
            </div>

            {/* HDL Cholesterol Input */}
            <div className="space-y-2">
              <Label htmlFor="hdlCholesterol">HDL (mg/dL)</Label>
              <Input
                id="hdlCholesterol"
                type="number"
                placeholder="Ex: 50"
                value={hdlCholesterol}
                onChange={(e) =>
                  handleInputChange("hdlCholesterol", e.target.value)
                }
                className={
                  errors.hdlCholesterol
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
                min="20"
                max="100"
              />
              {errors.hdlCholesterol && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.hdlCholesterol}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fatores de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diabetes"
                checked={diabetes}
                onCheckedChange={(checked) => setDiabetes(checked as boolean)}
              />
              <Label htmlFor="diabetes">Diabetes mellitus</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="smoking"
                checked={smoking}
                onCheckedChange={(checked) => setSmoking(checked as boolean)}
              />
              <Label htmlFor="smoking">Tabagismo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hypertensionTreatment"
                checked={hypertensionTreatment}
                onCheckedChange={(checked) =>
                  setHypertensionTreatment(checked as boolean)
                }
              />
              <Label htmlFor="hypertensionTreatment">
                Tratamento para hipertensão
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="familyHistory"
                checked={familyHistory}
                onCheckedChange={(checked) =>
                  setFamilyHistory(checked as boolean)
                }
              />
              <Label htmlFor="familyHistory">
                História familiar de DAC prematura
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fatores Agravantes (Opcionais)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="microalbuminuria">Microalbuminúria (mg/g)</Label>
              <Input
                id="microalbuminuria"
                type="number"
                placeholder="Ex: 30"
                value={microalbuminuria}
                onChange={(e) =>
                  handleInputChange("microalbuminuria", e.target.value)
                }
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hsCRP">PCR-us (mg/L)</Label>
              <Input
                id="hsCRP"
                type="number"
                placeholder="Ex: 2.5"
                value={hsCRP}
                onChange={(e) => handleInputChange("hsCRP", e.target.value)}
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coronaryCalciumScore">Escore de Cálcio</Label>
              <Input
                id="coronaryCalciumScore"
                type="number"
                placeholder="Ex: 100"
                value={coronaryCalciumScore}
                onChange={(e) =>
                  handleInputChange("coronaryCalciumScore", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleCalculate}
        disabled={!canCalculate || isCalculating}
        className="w-full"
        size="lg"
      >
        {isCalculating ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Calculator className="mr-2 h-4 w-4" />
          </motion.div>
        ) : (
          <Calculator className="mr-2 h-4 w-4" />
        )}
        {isCalculating ? "Calculando..." : "Calcular Risco Cardiovascular"}
      </Button>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-6">
              {/* Visual Gauge */}
              <CardiovascularRiskGauge
                riskPercentage={result.riskPercentage}
                riskCategory={result.riskCategory}
                framinghamScore={result.framinghamScore}
                hasHighRiskConditions={result.hasHighRiskConditions}
                aggravatingFactors={result.aggravatingFactors}
                reclassification={result.reclassification}
              />

              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Detalhes do Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* High Risk Conditions */}
                  {result.hasHighRiskConditions && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-900">
                        <AlertCircle className="h-5 w-5" />
                        Condições de Alto Risco Detectadas
                      </h4>
                      <ul className="space-y-1">
                        {result.highRiskConditions.map((condition, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm text-red-800"
                          >
                            <TrendingUp className="h-4 w-4" />
                            {condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Aggravating Factors */}
                  {result.aggravatingFactors.length > 0 && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-yellow-900">
                        <Zap className="h-5 w-5" />
                        Fatores Agravantes
                      </h4>
                      <ul className="space-y-1">
                        {result.aggravatingFactors.map((factor, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm text-yellow-800"
                          >
                            <AlertCircle className="h-4 w-4" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reclassification */}
                  {result.reclassification && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h4 className="mb-2 font-semibold text-blue-900">
                        Reclassificação
                      </h4>
                      <p className="text-sm text-blue-800">
                        {result.reclassification}
                      </p>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900">
                      Recomendações Terapêuticas
                    </h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((recommendation, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
