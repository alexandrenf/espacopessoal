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
  Calculator,
  Droplets,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  Activity,
} from "lucide-react";
import { LDLCalculator } from "~/lib/medical-calculators/basic-calculators";

interface LDLCalculatorFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (hasResult: boolean) => void;
  isCalculating: boolean;
}

interface LDLResult {
  success: boolean;
  ldl: number;
  classificacao: string;
  cor: string;
  formula: string;
  method: string;
  warnings?: string[];
}

export function LDLCalculatorForm({
  onCalculationStart,
  onCalculationComplete,
  isCalculating,
}: LDLCalculatorFormProps) {
  const [colesterolTotal, setColesterolTotal] = useState("");
  const [hdl, setHdl] = useState("");
  const [triglicerideos, setTriglicerideos] = useState("");
  const [result, setResult] = useState<LDLResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const calculator = new LDLCalculator();

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (touched.colesterolTotal && colesterolTotal) {
      const value = parseFloat(colesterolTotal);
      if (isNaN(value) || value < 100 || value > 500) {
        newErrors.colesterolTotal =
          "Colesterol total deve estar entre 100 e 500 mg/dL";
      }
    }

    if (touched.hdl && hdl) {
      const value = parseFloat(hdl);
      if (isNaN(value) || value < 20 || value > 100) {
        newErrors.hdl = "HDL deve estar entre 20 e 100 mg/dL";
      }
    }

    if (touched.triglicerideos && triglicerideos) {
      const value = parseFloat(triglicerideos);
      if (isNaN(value) || value < 50 || value > 1000) {
        newErrors.triglicerideos =
          "Triglicerídeos devem estar entre 50 e 1000 mg/dL";
      }
    }

    // Cross-validation
    if (colesterolTotal && hdl && touched.colesterolTotal && touched.hdl) {
      const totalValue = parseFloat(colesterolTotal);
      const hdlValue = parseFloat(hdl);
      if (!isNaN(totalValue) && !isNaN(hdlValue) && hdlValue >= totalValue) {
        newErrors.hdl = "HDL deve ser menor que o colesterol total";
      }
    }

    setErrors(newErrors);
  }, [colesterolTotal, hdl, triglicerideos, touched]);

  const handleInputChange = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    switch (field) {
      case "colesterolTotal":
        setColesterolTotal(value);
        break;
      case "hdl":
        setHdl(value);
        break;
      case "triglicerideos":
        setTriglicerideos(value);
        break;
    }
  };

  const handleCalculate = async () => {
    onCalculationStart();

    // Validate all inputs
    const allTouched = {
      colesterolTotal: true,
      hdl: true,
      triglicerideos: true,
    };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {};

    if (!colesterolTotal)
      newErrors.colesterolTotal = "Colesterol total é obrigatório";
    if (!hdl) newErrors.hdl = "HDL é obrigatório";
    if (!triglicerideos)
      newErrors.triglicerideos = "Triglicerídeos são obrigatórios";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onCalculationComplete(false);
      return;
    }

    try {
      // Simulate calculation delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      const inputs = {
        colesterolTotal: parseFloat(colesterolTotal),
        hdl: parseFloat(hdl),
        triglicerideos: parseFloat(triglicerideos),
      };

      const calculationResult = calculator.calculate(inputs);

      if (calculationResult.success) {
        const enhancedResult: LDLResult = {
          success: true,
          ldl: calculationResult.ldl!,
          classificacao: calculationResult.classificacao!,
          cor: calculationResult.cor!,
          formula: calculationResult.formula!,
          method: calculationResult.method!,
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

  const getClassificationColor = (classification: string) => {
    const colorMap: Record<string, string> = {
      Ótimo: "text-green-600 bg-green-50 border-green-200",
      Desejável: "text-blue-600 bg-blue-50 border-blue-200",
      Limítrofe: "text-yellow-600 bg-yellow-50 border-yellow-200",
      Alto: "text-orange-600 bg-orange-50 border-orange-200",
      "Muito alto": "text-red-600 bg-red-50 border-red-200",
    };
    return (
      colorMap[classification] ?? "text-gray-600 bg-gray-50 border-gray-200"
    );
  };

  const getRiskIcon = (classification: string) => {
    if (classification === "Ótimo" || classification === "Desejável") {
      return <CheckCircle className="h-5 w-5" />;
    }
    if (classification === "Limítrofe") {
      return <Info className="h-5 w-5" />;
    }
    return <AlertCircle className="h-5 w-5" />;
  };

  const getRecommendations = (
    classification: string,
    ldlValue: number,
  ): string[] => {
    const baseRecommendations = [
      "Mantenha uma dieta equilibrada e pobre em gorduras saturadas",
      "Pratique atividade física regularmente",
      "Consulte um cardiologista para avaliação completa",
    ];

    if (classification === "Ótimo") {
      return [
        "Mantenha os níveis atuais com estilo de vida saudável",
        "Continue com dieta mediterrânea",
        "Monitore anualmente",
        ...baseRecommendations,
      ];
    } else if (classification === "Muito alto" || classification === "Alto") {
      return [
        "Considere terapia medicamentosa (estatinas)",
        "Reduza drasticamente gorduras saturadas e trans",
        "Aumente consumo de fibras solúveis",
        "Monitore mensalmente até atingir meta",
        "Avalie outros fatores de risco cardiovascular",
        ...baseRecommendations,
      ];
    } else if (classification === "Limítrofe") {
      return [
        "Intensifique mudanças no estilo de vida",
        "Considere suplementação com ômega-3",
        "Monitore a cada 3-6 meses",
        "Avalie necessidade de medicação",
        ...baseRecommendations,
      ];
    }

    return baseRecommendations;
  };

  const canCalculate =
    colesterolTotal &&
    hdl &&
    triglicerideos &&
    Object.keys(errors).length === 0;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Perfil Lipídico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Colesterol Total Input */}
            <div className="space-y-2">
              <Label htmlFor="colesterolTotal">Colesterol Total (mg/dL)</Label>
              <Input
                id="colesterolTotal"
                type="number"
                placeholder="Ex: 200"
                value={colesterolTotal}
                onChange={(e) =>
                  handleInputChange("colesterolTotal", e.target.value)
                }
                className={
                  errors.colesterolTotal
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
                step="1"
                min="100"
                max="500"
              />
              {errors.colesterolTotal && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.colesterolTotal}
                </p>
              )}
            </div>

            {/* HDL Input */}
            <div className="space-y-2">
              <Label htmlFor="hdl">HDL (mg/dL)</Label>
              <Input
                id="hdl"
                type="number"
                placeholder="Ex: 50"
                value={hdl}
                onChange={(e) => handleInputChange("hdl", e.target.value)}
                className={
                  errors.hdl ? "border-red-500 focus:border-red-500" : ""
                }
                step="1"
                min="20"
                max="100"
              />
              {errors.hdl && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.hdl}
                </p>
              )}
            </div>

            {/* Triglicerídeos Input */}
            <div className="space-y-2">
              <Label htmlFor="triglicerideos">Triglicerídeos (mg/dL)</Label>
              <Input
                id="triglicerideos"
                type="number"
                placeholder="Ex: 150"
                value={triglicerideos}
                onChange={(e) =>
                  handleInputChange("triglicerideos", e.target.value)
                }
                className={
                  errors.triglicerideos
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
                step="1"
                min="50"
                max="1000"
              />
              {errors.triglicerideos && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.triglicerideos}
                </p>
              )}
            </div>
          </div>

          {/* High Triglycerides Warning */}
          {triglicerideos && parseFloat(triglicerideos) >= 400 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Para triglicerídeos ≥ 400 mg/dL, a
                fórmula de Friedewald não é válida. Considere dosagem direta de
                LDL ou fórmula de Martin-Hopkins.
              </AlertDescription>
            </Alert>
          )}

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
            {isCalculating ? "Calculando..." : "Calcular LDL"}
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
                  Resultado do LDL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Result */}
                <div className="text-center">
                  <div className="mb-2 text-4xl font-bold text-slate-900">
                    {result.ldl.toFixed(1)}{" "}
                    <span className="text-lg font-normal text-slate-600">
                      mg/dL
                    </span>
                  </div>
                  <Badge
                    className={`px-3 py-1 text-sm ${getClassificationColor(result.classificacao)}`}
                  >
                    {getRiskIcon(result.classificacao)}
                    <span className="ml-2">{result.classificacao}</span>
                  </Badge>
                </div>

                <Separator />

                {/* Method and Formula */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                    <span className="font-medium text-slate-700">
                      Método utilizado:
                    </span>
                    <Badge variant="outline" className="font-medium">
                      {result.method === "friedewald"
                        ? "Friedewald"
                        : "Martin-Hopkins"}
                    </Badge>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 font-semibold text-blue-900">
                      Fórmula:
                    </h4>
                    <code className="font-mono text-sm text-blue-800">
                      {result.formula}
                    </code>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Avisos Importantes
                    </h4>
                    <ul className="space-y-1">
                      {result.warnings.map((warning, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 rounded bg-yellow-50 p-2 text-sm text-yellow-800"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Assessment */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-900">
                        Risco Cardiovascular
                      </span>
                    </div>
                    <p className="text-sm text-red-800">
                      {result.classificacao === "Ótimo" ||
                      result.classificacao === "Desejável"
                        ? "Baixo risco cardiovascular"
                        : result.classificacao === "Limítrofe"
                          ? "Risco moderado - monitoramento necessário"
                          : "Alto risco - intervenção recomendada"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">
                        Meta Terapêutica
                      </span>
                    </div>
                    <p className="text-sm text-blue-800">
                      {result.ldl < 100
                        ? "Meta atingida para a maioria dos pacientes"
                        : result.ldl < 130
                          ? "Adequado para baixo risco cardiovascular"
                          : "Acima da meta - considere intervenção"}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900">
                    Recomendações
                  </h4>
                  <ul className="space-y-2">
                    {getRecommendations(result.classificacao, result.ldl).map(
                      (recommendation, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                          {recommendation}
                        </li>
                      ),
                    )}
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
