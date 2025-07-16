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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Calculator,
  Heart,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingDown,
  Activity,
} from "lucide-react";
import { CKDEPICalculator } from "~/lib/medical-calculators/basic-calculators";

interface CKDEPICalculatorFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (hasResult: boolean) => void;
  isCalculating: boolean;
}

interface CKDEPIResult {
  eGFR: number;
  classificacao: string;
  cor: string;
  stage: number;
  formula: string;
  warnings?: string[];
}

export function CKDEPICalculatorForm({
  onCalculationStart,
  onCalculationComplete,
  isCalculating,
}: CKDEPICalculatorFormProps) {
  const [creatinina, setCreatinina] = useState("");
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState<"M" | "F" | "">("");
  const [result, setResult] = useState<CKDEPIResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const calculator = new CKDEPICalculator();

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (touched.creatinina && creatinina) {
      const value = parseFloat(creatinina);
      if (isNaN(value) || value < 0.3 || value > 15) {
        newErrors.creatinina = "Creatinina deve estar entre 0.3 e 15 mg/dL";
      }
    }

    if (touched.idade && idade) {
      const value = parseFloat(idade);
      if (isNaN(value) || value < 18 || value > 120) {
        newErrors.idade = "Idade deve estar entre 18 e 120 anos";
      }
    }

    setErrors(newErrors);
  }, [creatinina, idade, touched]);

  const handleInputChange = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    switch (field) {
      case "creatinina":
        setCreatinina(value);
        break;
      case "idade":
        setIdade(value);
        break;
    }
  };

  const handleCalculate = async () => {
    onCalculationStart();

    // Validate all inputs
    const allTouched = { creatinina: true, idade: true, sexo: true };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {};

    if (!creatinina) newErrors.creatinina = "Creatinina é obrigatória";
    if (!idade) newErrors.idade = "Idade é obrigatória";
    if (!sexo) newErrors.sexo = "Sexo é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onCalculationComplete(false);
      return;
    }

    try {
      // Simulate calculation delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const inputs = {
        creatinina: parseFloat(creatinina),
        idade: parseFloat(idade),
        sexo: sexo as "M" | "F",
      };

      const calculationResult = calculator.calculate(inputs);

      if (calculationResult.success) {
        const enhancedResult: CKDEPIResult = {
          eGFR: calculationResult.eGFR!,
          classificacao: calculationResult.classificacao!,
          cor: calculationResult.cor!,
          stage: calculationResult.stage!,
          formula: calculationResult.formula!,
          warnings: calculationResult.warnings,
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

  const getStageColor = (stage: number) => {
    const colorMap: Record<number, string> = {
      1: "text-green-600 bg-green-50 border-green-200",
      2: "text-yellow-600 bg-yellow-50 border-yellow-200",
      3: "text-orange-600 bg-orange-50 border-orange-200",
      4: "text-red-600 bg-red-50 border-red-200",
      5: "text-red-800 bg-red-100 border-red-300",
    };
    return colorMap[stage] ?? "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getStageIcon = (stage: number) => {
    if (stage === 1) return <CheckCircle className="h-5 w-5" />;
    if (stage === 2) return <Info className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  const getStageDescription = (stage: number): string => {
    const descriptions: Record<number, string> = {
      1: "Função renal normal com fatores de risco",
      2: "Leve diminuição da função renal",
      3: "Moderada diminuição da função renal",
      4: "Severa diminuição da função renal",
      5: "Falência renal - necessita diálise ou transplante",
    };
    return descriptions[stage] ?? "Estágio indeterminado";
  };

  const getRecommendations = (stage: number, eGFR: number): string[] => {
    const baseRecommendations = [
      "Controle rigoroso da pressão arterial",
      "Controle glicêmico em diabéticos",
      "Evite medicamentos nefrotóxicos",
      "Mantenha hidratação adequada",
    ];

    if (stage === 1) {
      return [
        "Monitore anualmente a função renal",
        "Trate fatores de risco cardiovascular",
        "Mantenha estilo de vida saudável",
        ...baseRecommendations,
      ];
    } else if (stage === 2) {
      return [
        "Monitore a cada 6-12 meses",
        "Investigue e trate causas da DRC",
        "Avalie complicações da DRC",
        ...baseRecommendations,
      ];
    } else if (stage === 3) {
      return [
        "Monitore a cada 3-6 meses",
        "Avalie e trate complicações da DRC",
        "Considere encaminhamento ao nefrologista",
        "Prepare para terapia renal substitutiva",
        "Ajuste doses de medicamentos",
        ...baseRecommendations,
      ];
    } else if (stage === 4) {
      return [
        "Acompanhamento nefrológico obrigatório",
        "Prepare para diálise ou transplante",
        "Monitore mensalmente",
        "Trate complicações (anemia, distúrbios minerais)",
        "Planejamento de acesso vascular",
        ...baseRecommendations,
      ];
    } else if (stage === 5) {
      return [
        "Inicie terapia renal substitutiva",
        "Acompanhamento nefrológico intensivo",
        "Considere transplante renal",
        "Trate complicações da uremia",
        "Suporte nutricional especializado",
        ...baseRecommendations,
      ];
    }

    return baseRecommendations;
  };

  const canCalculate = creatinina && idade && sexo && Object.keys(errors).length === 0;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Função Renal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Creatinina Input */}
            <div className="space-y-2">
              <Label htmlFor="creatinina">Creatinina (mg/dL)</Label>
              <Input
                id="creatinina"
                type="number"
                placeholder="Ex: 1.2"
                value={creatinina}
                onChange={(e) => handleInputChange("creatinina", e.target.value)}
                className={errors.creatinina ? "border-red-500 focus:border-red-500" : ""}
                step="0.1"
                min="0.3"
                max="15"
              />
              {errors.creatinina && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.creatinina}
                </p>
              )}
            </div>

            {/* Idade Input */}
            <div className="space-y-2">
              <Label htmlFor="idade">Idade (anos)</Label>
              <Input
                id="idade"
                type="number"
                placeholder="Ex: 45"
                value={idade}
                onChange={(e) => handleInputChange("idade", e.target.value)}
                className={errors.idade ? "border-red-500 focus:border-red-500" : ""}
                min="18"
                max="120"
              />
              {errors.idade && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.idade}
                </p>
              )}
            </div>

            {/* Sexo Select */}
            <div className="space-y-2">
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={sexo} onValueChange={(value: "M" | "F") => {
                setSexo(value);
                setTouched(prev => ({ ...prev, sexo: true }));
              }}>
                <SelectTrigger className={errors.sexo ? "border-red-500 focus:border-red-500" : ""}>
                  <SelectValue placeholder="Selecione o sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
              {errors.sexo && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.sexo}
                </p>
              )}
            </div>
          </div>

          {/* Formula Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">CKD-EPI 2021</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Esta calculadora utiliza a equação CKD-EPI 2021, que não inclui o coeficiente racial, 
                  sendo mais adequada para populações diversas.
                </p>
              </div>
            </div>
          </div>

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
            {isCalculating ? "Calculando..." : "Calcular TFG"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Taxa de Filtração Glomerular
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Result */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900 mb-2">
                    {result.eGFR.toFixed(1)} <span className="text-lg font-normal text-slate-600">mL/min/1.73m²</span>
                  </div>
                  <Badge className={`text-sm px-3 py-1 ${getStageColor(result.stage)}`}>
                    {getStageIcon(result.stage)}
                    <span className="ml-2">Estágio {result.stage} - {result.classificacao}</span>
                  </Badge>
                </div>

                <Separator />

                {/* Stage Information */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Classificação da DRC</h4>
                  <p className="text-sm text-slate-700">{getStageDescription(result.stage)}</p>
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Alertas Clínicos
                    </h4>
                    <ul className="space-y-1">
                      {result.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-yellow-800 bg-yellow-50 p-2 rounded">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clinical Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">Função Renal</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      {result.eGFR >= 90 
                        ? "Função renal preservada" 
                        : result.eGFR >= 60
                        ? "Leve redução da função renal"
                        : result.eGFR >= 30
                        ? "Moderada a severa redução"
                        : "Falência renal avançada"}
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-900">Urgência</span>
                    </div>
                    <p className="text-sm text-red-800">
                      {result.stage <= 2 
                        ? "Monitoramento de rotina" 
                        : result.stage === 3
                        ? "Avaliação nefrológica recomendada"
                        : "Acompanhamento nefrológico urgente"}
                    </p>
                  </div>
                </div>

                {/* Formula */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Fórmula Utilizada:</h4>
                  <p className="text-sm text-green-800 font-mono">{result.formula}</p>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900">Recomendações Clínicas</h4>
                  <ul className="space-y-2">
                    {getRecommendations(result.stage, result.eGFR).map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}