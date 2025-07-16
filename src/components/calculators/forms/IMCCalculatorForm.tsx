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
  Scale,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { IMCCalculator } from "~/lib/medical-calculators/basic-calculators";
import { imcValidation } from "~/lib/medical-calculators/validation";

interface IMCCalculatorFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (hasResult: boolean) => void;
  isCalculating: boolean;
}

interface IMCResult {
  imc: number;
  classification: string;
  healthRisk: string;
  idealWeightRange: { min: number; max: number };
  weightDifference: number;
  recommendations: string[];
}

export function IMCCalculatorForm({
  onCalculationStart,
  onCalculationComplete,
  isCalculating,
}: IMCCalculatorFormProps) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino" | "">("");
  const [result, setResult] = useState<IMCResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const calculator = new IMCCalculator();

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (touched.weight && weight) {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 1 || weightNum > 500) {
        newErrors.weight = "Peso deve estar entre 1 e 500 kg";
      }
    }

    if (touched.height && height) {
      const heightNum = parseFloat(height);
      if (isNaN(heightNum) || heightNum < 50 || heightNum > 250) {
        newErrors.height = "Altura deve estar entre 50 e 250 cm";
      }
    }

    if (touched.age && age) {
      const ageNum = parseFloat(age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        newErrors.age = "Idade deve estar entre 1 e 120 anos";
      }
    }

    setErrors(newErrors);
  }, [weight, height, age, touched]);

  const handleInputChange = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    switch (field) {
      case "weight":
        setWeight(value);
        break;
      case "height":
        setHeight(value);
        break;
      case "age":
        setAge(value);
        break;
    }
  };

  const handleCalculate = async () => {
    onCalculationStart();

    // Validate all inputs
    const allTouched = { weight: true, height: true, age: true, gender: true };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {};

    if (!weight) newErrors.weight = "Peso é obrigatório";
    if (!height) newErrors.height = "Altura é obrigatória";
    if (!age) newErrors.age = "Idade é obrigatória";
    if (!gender) newErrors.gender = "Sexo é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onCalculationComplete(false);
      return;
    }

    try {
      // Simulate calculation delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const inputs = {
        peso: parseFloat(weight),
        altura: parseFloat(height) / 100, // Convert cm to meters
      };

      const calculationResult = calculator.calculate(inputs);

      if (calculationResult.success) {
        const imc = calculationResult.imc!;
        const classification = calculationResult.classificacao!;
        
        // Enhanced result with additional calculations
        const idealWeightRange = calculateIdealWeightRange(parseFloat(height));
        const weightDifference = parseFloat(weight) - (idealWeightRange.min + idealWeightRange.max) / 2;
        const recommendations = getRecommendations(classification, weightDifference);
        const healthRisk = getHealthRisk(classification);

        const enhancedResult: IMCResult = {
          imc,
          classification,
          healthRisk,
          idealWeightRange,
          weightDifference,
          recommendations,
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

  const calculateIdealWeightRange = (heightInCm: number) => {
    const heightInM = heightInCm / 100;
    return {
      min: Math.round(18.5 * heightInM * heightInM * 10) / 10,
      max: Math.round(24.9 * heightInM * heightInM * 10) / 10,
    };
  };

  const getHealthRisk = (classification: string): string => {
    const riskMap: Record<string, string> = {
      "Baixo peso": "Aumentado",
      "Peso normal": "Baixo",
      "Sobrepeso": "Pouco aumentado",
      "Obesidade grau I": "Aumentado",
      "Obesidade grau II": "Muito aumentado",
      "Obesidade grau III": "Extremamente aumentado",
    };
    return riskMap[classification] ?? "Indeterminado";
  };

  const getRecommendations = (classification: string, weightDiff: number): string[] => {
    const baseRecommendations = [
      "Mantenha uma alimentação equilibrada",
      "Pratique atividade física regularmente",
      "Consulte um profissional de saúde",
    ];

    if (classification === "Baixo peso") {
      return [
        "Aumente o consumo calórico de forma saudável",
        "Inclua proteínas em todas as refeições",
        "Considere suplementação nutricional",
        ...baseRecommendations,
      ];
    } else if (classification.includes("Obesidade")) {
      return [
        "Reduza o consumo calórico gradualmente",
        "Aumente a frequência de exercícios",
        "Considere acompanhamento nutricional especializado",
        "Monitore outros fatores de risco cardiovascular",
        ...baseRecommendations,
      ];
    } else if (classification === "Sobrepeso") {
      return [
        "Mantenha déficit calórico moderado",
        "Combine exercícios aeróbicos e de força",
        "Monitore o progresso semanalmente",
        ...baseRecommendations,
      ];
    }

    return baseRecommendations;
  };

  const getClassificationColor = (classification: string) => {
    const colorMap: Record<string, string> = {
      "Baixo peso": "text-blue-600 bg-blue-50 border-blue-200",
      "Peso normal": "text-green-600 bg-green-50 border-green-200",
      "Sobrepeso": "text-yellow-600 bg-yellow-50 border-yellow-200",
      "Obesidade grau I": "text-orange-600 bg-orange-50 border-orange-200",
      "Obesidade grau II": "text-red-600 bg-red-50 border-red-200",
      "Obesidade grau III": "text-red-800 bg-red-100 border-red-300",
      "Abaixo do peso": "text-blue-600 bg-blue-50 border-blue-200",
    };
    return colorMap[classification] ?? "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getRiskIcon = (classification: string) => {
    if (classification === "Peso normal") return <CheckCircle className="h-5 w-5" />;
    if (classification === "Baixo peso" || classification === "Sobrepeso") return <Minus className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  const canCalculate = weight && height && age && gender && Object.keys(errors).length === 0;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Dados Antropométricos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weight Input */}
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="Ex: 70.5"
                value={weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className={errors.weight ? "border-red-500 focus:border-red-500" : ""}
                step="0.1"
                min="1"
                max="300"
              />
              {errors.weight && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.weight}
                </p>
              )}
            </div>

            {/* Height Input */}
            <div className="space-y-2">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="Ex: 175"
                value={height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                className={errors.height ? "border-red-500 focus:border-red-500" : ""}
                step="0.1"
                min="50"
                max="250"
              />
              {errors.height && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.height}
                </p>
              )}
            </div>

            {/* Age Input */}
            <div className="space-y-2">
              <Label htmlFor="age">Idade (anos)</Label>
              <Input
                id="age"
                type="number"
                placeholder="Ex: 30"
                value={age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                className={errors.age ? "border-red-500 focus:border-red-500" : ""}
                min="1"
                max="120"
              />
              {errors.age && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.age}
                </p>
              )}
            </div>

            {/* Gender Select */}
            <div className="space-y-2">
              <Label htmlFor="gender">Sexo</Label>
              <Select value={gender} onValueChange={(value: "masculino" | "feminino") => {
                setGender(value);
                setTouched(prev => ({ ...prev, gender: true }));
              }}>
                <SelectTrigger className={errors.gender ? "border-red-500 focus:border-red-500" : ""}>
                  <SelectValue placeholder="Selecione o sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.gender}
                </p>
              )}
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
            {isCalculating ? "Calculando..." : "Calcular IMC"}
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
                  Resultado do IMC
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Result */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900 mb-2">
                    {result.imc.toFixed(1)}
                  </div>
                  <Badge className={`text-sm px-3 py-1 ${getClassificationColor(result.classification)}`}>
                    {getRiskIcon(result.classification)}
                    <span className="ml-2">{result.classification}</span>
                  </Badge>
                </div>

                <Separator />

                {/* Health Risk */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Risco para a saúde:</span>
                  <Badge variant="outline" className="font-medium">
                    {result.healthRisk}
                  </Badge>
                </div>

                {/* Weight Analysis */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900">Análise do Peso</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Peso Ideal</div>
                      <div className="text-lg font-semibold text-blue-900">
                        {result.idealWeightRange.min} - {result.idealWeightRange.max} kg
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-600 font-medium">Diferença</div>
                      <div className={`text-lg font-semibold flex items-center gap-1 ${
                        result.weightDifference > 0 ? "text-red-600" : result.weightDifference < 0 ? "text-blue-600" : "text-green-600"
                      }`}>
                        {result.weightDifference > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : result.weightDifference < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {result.weightDifference > 0 ? "+" : ""}{result.weightDifference.toFixed(1)} kg
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900">Recomendações</h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((recommendation, index) => (
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