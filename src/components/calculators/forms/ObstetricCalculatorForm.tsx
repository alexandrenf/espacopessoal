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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Calculator,
  Baby,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Heart,
  Stethoscope,
} from "lucide-react";
import { ObstetricCalculator } from "~/lib/medical-calculators/basic-calculators";
import { GestationalTimeline } from "~/components/calculators/indicators/GestationalTimeline";

interface ObstetricCalculatorFormProps {
  onCalculationStart: () => void;
  onCalculationComplete: (hasResult: boolean) => void;
  isCalculating: boolean;
}

interface ObstetricResult {
  success: boolean;
  weeks: number;
  days: number;
  totalDays: number;
  dpp: string;
  gestationalAge: string;
  effectiveDUM: string;
  method: string;
}

export function ObstetricCalculatorForm({
  onCalculationStart,
  onCalculationComplete,
  isCalculating,
}: ObstetricCalculatorFormProps) {
  const [mode, setMode] = useState<
    "dum" | "ultrasound" | "conception" | "ivf" | ""
  >("");
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // DUM fields
  const [dum, setDum] = useState("");

  // Ultrasound fields
  const [ultrasoundDate, setUltrasoundDate] = useState("");
  const [ultrasoundWeeks, setUltrasoundWeeks] = useState("");
  const [ultrasoundDays, setUltrasoundDays] = useState("");

  // Conception fields
  const [conceptionDate, setConceptionDate] = useState("");

  // IVF fields
  const [transferDate, setTransferDate] = useState("");
  const [embryoAge, setEmbryoAge] = useState<3 | 5 | 6 | "">("");

  const [result, setResult] = useState<ObstetricResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const calculator = new ObstetricCalculator();

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (mode === "ultrasound" && touched.ultrasoundWeeks && ultrasoundWeeks) {
      const weeks = parseInt(ultrasoundWeeks);
      if (isNaN(weeks) || weeks < 4 || weeks > 42) {
        newErrors.ultrasoundWeeks = "Semanas devem estar entre 4 e 42";
      }
    }

    if (mode === "ultrasound" && touched.ultrasoundDays && ultrasoundDays) {
      const days = parseInt(ultrasoundDays);
      if (isNaN(days) || days < 0 || days > 6) {
        newErrors.ultrasoundDays = "Dias devem estar entre 0 e 6";
      }
    }

    setErrors(newErrors);
  }, [mode, ultrasoundWeeks, ultrasoundDays, touched]);

  const handleCalculate = async () => {
    onCalculationStart();

    const newErrors: Record<string, string> = {};

    if (!mode) newErrors.mode = "Método de cálculo é obrigatório";
    if (!currentDate) newErrors.currentDate = "Data atual é obrigatória";

    // Early return if there are basic errors
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onCalculationComplete(false);
      return;
    }

    // Mode-specific validation
    switch (mode) {
      case "dum":
        if (!dum) newErrors.dum = "Data da última menstruação é obrigatória";
        break;
      case "ultrasound":
        if (!ultrasoundDate)
          newErrors.ultrasoundDate = "Data do ultrassom é obrigatória";
        if (!ultrasoundWeeks)
          newErrors.ultrasoundWeeks = "Semanas no ultrassom são obrigatórias";
        if (ultrasoundDays === "")
          newErrors.ultrasoundDays = "Dias no ultrassom são obrigatórios";
        break;
      case "conception":
        if (!conceptionDate)
          newErrors.conceptionDate = "Data da concepção é obrigatória";
        break;
      case "ivf":
        if (!transferDate)
          newErrors.transferDate = "Data da transferência é obrigatória";
        if (!embryoAge) newErrors.embryoAge = "Idade do embrião é obrigatória";
        break;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onCalculationComplete(false);
      return;
    }

    try {
      let inputs;

      switch (mode) {
        case "dum":
          inputs = {
            mode,
            currentDate: currentDate!,
            dum,
          };
          break;
        case "ultrasound":
          inputs = {
            mode,
            currentDate: currentDate!,
            ultrasoundDate,
            ultrasoundWeeks: parseInt(ultrasoundWeeks),
            ultrasoundDays: parseInt(ultrasoundDays),
          };
          break;
        case "conception":
          inputs = {
            mode,
            currentDate: currentDate!,
            conceptionDate,
          };
          break;
        case "ivf":
          inputs = {
            mode,
            currentDate: currentDate!,
            transferDate,
            embryoAge: embryoAge as 3 | 5 | 6,
          };
          break;
        default:
          inputs = { mode: mode as "dum", currentDate: currentDate! };
      }

      const calculationResult = calculator.calculate(inputs);

      if (calculationResult.success) {
        const enhancedResult: ObstetricResult = {
          success: true,
          weeks: calculationResult.weeks ?? 0,
          days: calculationResult.days ?? 0,
          totalDays: calculationResult.totalDays ?? 0,
          dpp: calculationResult.dpp ?? "",
          gestationalAge: calculationResult.gestationalAge ?? "",
          effectiveDUM: calculationResult.effectiveDUM ?? "",
          method: calculationResult.method ?? "dum",
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

  const getGestationalStage = (
    weeks: number,
  ): { stage: string; color: string; description: string } => {
    if (weeks < 12) {
      return {
        stage: "1º Trimestre",
        color: "text-blue-600 bg-blue-50 border-blue-200",
        description: "Período de organogênese e maior risco de malformações",
      };
    } else if (weeks < 28) {
      return {
        stage: "2º Trimestre",
        color: "text-green-600 bg-green-50 border-green-200",
        description:
          "Período de crescimento fetal e menor risco de complicações",
      };
    } else if (weeks < 37) {
      return {
        stage: "3º Trimestre",
        color: "text-orange-600 bg-orange-50 border-orange-200",
        description: "Período de maturação fetal e preparação para o parto",
      };
    } else if (weeks < 42) {
      return {
        stage: "A Termo",
        color: "text-green-700 bg-green-100 border-green-300",
        description: "Período ideal para o nascimento",
      };
    } else {
      return {
        stage: "Pós-termo",
        color: "text-red-600 bg-red-50 border-red-200",
        description: "Gravidez prolongada - monitoramento intensivo necessário",
      };
    }
  };

  const getRecommendations = (weeks: number): string[] => {
    const baseRecommendations = [
      "Mantenha acompanhamento pré-natal regular",
      "Tome ácido fólico conforme orientação médica",
      "Mantenha alimentação saudável e balanceada",
      "Evite álcool, tabaco e drogas",
    ];

    if (weeks < 12) {
      return [
        "Confirme gravidez com exame de sangue (beta-hCG)",
        "Inicie suplementação com ácido fólico",
        "Realize primeira consulta pré-natal",
        "Solicite exames de rotina do 1º trimestre",
        "Evite medicamentos sem orientação médica",
        ...baseRecommendations,
      ];
    } else if (weeks < 28) {
      return [
        "Realize ultrassom morfológico (18-24 semanas)",
        "Faça exames de rotina do 2º trimestre",
        "Considere amniocentese se indicada",
        "Monitore movimentos fetais",
        "Mantenha atividade física adequada",
        ...baseRecommendations,
      ];
    } else if (weeks < 37) {
      return [
        "Intensifique o acompanhamento pré-natal",
        "Realize exames de rotina do 3º trimestre",
        "Monitore crescimento fetal",
        "Prepare-se para o parto",
        "Atenção aos sinais de trabalho de parto prematuro",
        ...baseRecommendations,
      ];
    } else if (weeks < 42) {
      return [
        "Monitore movimentos fetais diariamente",
        "Esteja atenta aos sinais de trabalho de parto",
        "Tenha a mala da maternidade pronta",
        "Realize cardiotocografia se indicada",
        "Mantenha contato próximo com a equipe médica",
        ...baseRecommendations,
      ];
    } else {
      return [
        "Acompanhamento médico intensivo obrigatório",
        "Realize cardiotocografia regularmente",
        "Considere indução do parto",
        "Monitore líquido amniótico",
        "Avalie bem-estar fetal frequentemente",
        ...baseRecommendations,
      ];
    }
  };

  const canCalculate = mode && currentDate && Object.keys(errors).length === 0;

  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Método de Cálculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mode">Selecione o método de cálculo</Label>
            <Select
              value={mode}
              onValueChange={(
                value: "dum" | "ultrasound" | "conception" | "ivf",
              ) => {
                setMode(value);
                setErrors({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dum">
                  Data da Última Menstruação (DUM)
                </SelectItem>
                <SelectItem value="ultrasound">Ultrassom</SelectItem>
                <SelectItem value="conception">Data da Concepção</SelectItem>
                <SelectItem value="ivf">Fertilização in Vitro (FIV)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentDate">Data Atual</Label>
            <Input
              id="currentDate"
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className={
                errors.currentDate ? "border-red-500 focus:border-red-500" : ""
              }
            />
            {errors.currentDate && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.currentDate}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Method-specific inputs */}
      {mode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {mode === "dum" && "Data da Última Menstruação"}
              {mode === "ultrasound" && "Dados do Ultrassom"}
              {mode === "conception" && "Data da Concepção"}
              {mode === "ivf" && "Dados da FIV"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "dum" && (
              <div className="space-y-2">
                <Label htmlFor="dum">Data da Última Menstruação</Label>
                <Input
                  id="dum"
                  type="date"
                  value={dum}
                  onChange={(e) => setDum(e.target.value)}
                  className={
                    errors.dum ? "border-red-500 focus:border-red-500" : ""
                  }
                />
                {errors.dum && (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.dum}
                  </p>
                )}
              </div>
            )}

            {mode === "ultrasound" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ultrasoundDate">Data do Ultrassom</Label>
                  <Input
                    id="ultrasoundDate"
                    type="date"
                    value={ultrasoundDate}
                    onChange={(e) => setUltrasoundDate(e.target.value)}
                    className={
                      errors.ultrasoundDate
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
                  />
                  {errors.ultrasoundDate && (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.ultrasoundDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ultrasoundWeeks">Semanas</Label>
                  <Input
                    id="ultrasoundWeeks"
                    type="number"
                    placeholder="Ex: 20"
                    value={ultrasoundWeeks}
                    onChange={(e) => {
                      setUltrasoundWeeks(e.target.value);
                      setTouched((prev) => ({
                        ...prev,
                        ultrasoundWeeks: true,
                      }));
                    }}
                    className={
                      errors.ultrasoundWeeks
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
                    min="4"
                    max="42"
                  />
                  {errors.ultrasoundWeeks && (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.ultrasoundWeeks}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ultrasoundDays">Dias</Label>
                  <Input
                    id="ultrasoundDays"
                    type="number"
                    placeholder="Ex: 3"
                    value={ultrasoundDays}
                    onChange={(e) => {
                      setUltrasoundDays(e.target.value);
                      setTouched((prev) => ({ ...prev, ultrasoundDays: true }));
                    }}
                    className={
                      errors.ultrasoundDays
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
                    min="0"
                    max="6"
                  />
                  {errors.ultrasoundDays && (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.ultrasoundDays}
                    </p>
                  )}
                </div>
              </div>
            )}

            {mode === "conception" && (
              <div className="space-y-2">
                <Label htmlFor="conceptionDate">Data da Concepção</Label>
                <Input
                  id="conceptionDate"
                  type="date"
                  value={conceptionDate}
                  onChange={(e) => setConceptionDate(e.target.value)}
                  className={
                    errors.conceptionDate
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }
                />
                {errors.conceptionDate && (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.conceptionDate}
                  </p>
                )}
              </div>
            )}

            {mode === "ivf" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transferDate">Data da Transferência</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className={
                      errors.transferDate
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
                  />
                  {errors.transferDate && (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.transferDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embryoAge">Idade do Embrião</Label>
                  <Select
                    value={embryoAge.toString()}
                    onValueChange={(value: "3" | "5" | "6") => {
                      setEmbryoAge(parseInt(value) as 3 | 5 | 6);
                    }}
                  >
                    <SelectTrigger
                      className={
                        errors.embryoAge
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Selecione a idade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="5">5 dias (blastocisto)</SelectItem>
                      <SelectItem value="6">6 dias (blastocisto)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.embryoAge && (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.embryoAge}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
        {isCalculating ? "Calculando..." : "Calcular Idade Gestacional"}
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
              {/* Visual Timeline */}
              <GestationalTimeline
                weeks={result.weeks}
                days={result.days}
                totalDays={result.totalDays}
                dpp={result.dpp}
                method={result.method}
                effectiveDUM={result.effectiveDUM}
              />

              {/* Detailed Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Recomendações para este Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {getRecommendations(result.weeks).map(
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
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
