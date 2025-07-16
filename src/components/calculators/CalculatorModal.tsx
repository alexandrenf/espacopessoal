"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components_new/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Calculator,
  Info,
  BookOpen,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Copy,
  Download,
} from "lucide-react";
import { CalculatorInfo } from "~/types/medical-calculators";

// Import calculator components
import { IMCCalculatorForm } from "./forms/IMCCalculatorForm";
import { LDLCalculatorForm } from "./forms/LDLCalculatorForm";
import { CKDEPICalculatorForm } from "./forms/CKDEPICalculatorForm";
import { ObstetricCalculatorForm } from "./forms/ObstetricCalculatorForm";
import { CardiovascularRiskCalculatorForm } from "./forms/CardiovascularRiskCalculatorForm";

interface CalculatorModalProps {
  calculator: CalculatorInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorModal({
  calculator,
  isOpen,
  onClose,
}: CalculatorModalProps) {
  const [activeTab, setActiveTab] = useState("calculator");
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when calculator changes
  useEffect(() => {
    if (calculator) {
      setActiveTab("calculator");
      setHasResult(false);
      setIsCalculating(false);
    }
  }, [calculator]);

  // Auto-focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector(
        'input, select, textarea'
      );
      if (firstInput && firstInput instanceof HTMLElement) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [isOpen, activeTab]);

  const handleCalculationStart = () => {
    setIsCalculating(true);
  };

  const handleCalculationComplete = (hasValidResult: boolean) => {
    setIsCalculating(false);
    setHasResult(hasValidResult);
    if (hasValidResult) {
      setActiveTab("result");
    }
  };

  const handleReset = () => {
    setHasResult(false);
    setActiveTab("calculator");
  };

  const renderCalculatorForm = () => {
    if (!calculator) return null;

    const commonProps = {
      onCalculationStart: handleCalculationStart,
      onCalculationComplete: handleCalculationComplete,
      isCalculating,
    };

    switch (calculator.id) {
      case "imc":
        return <IMCCalculatorForm {...commonProps} />;
      case "ldl":
        return <LDLCalculatorForm {...commonProps} />;
      case "ckd-epi":
        return <CKDEPICalculatorForm {...commonProps} />;
      case "idade-gestacional":
        return <ObstetricCalculatorForm {...commonProps} />;
      case "risco-cardiovascular":
        return <CardiovascularRiskCalculatorForm {...commonProps} />;
      default:
        return (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">
                Calculadora não implementada
              </p>
            </div>
          </div>
        );
    }
  };

  if (!calculator) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-h-[90vh] max-w-6xl overflow-hidden rounded-2xl border-0 p-0 shadow-2xl"
        ref={modalRef}
      >
        {/* Enhanced Header */}
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
                className={`rounded-xl bg-gradient-to-br ${calculator.color} p-3 text-white shadow-lg`}
              >
                {calculator.icon}
              </motion.div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  {calculator.title}
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-600">
                  {calculator.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {calculator.category}
              </Badge>
              <Badge 
                variant={calculator.popularity === "Muito Popular" ? "default" : "outline"}
                className="text-xs"
              >
                {calculator.popularity}
              </Badge>
              {calculator.version && (
                <Badge variant="outline" className="text-xs">
                  v{calculator.version}
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`h-2 w-8 rounded-full ${
                activeTab === "calculator" ? "bg-blue-500" : "bg-blue-200"
              }`} />
              <span className="text-xs text-slate-600">Entrada</span>
            </div>
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <div className="flex items-center gap-1">
              <div className={`h-2 w-8 rounded-full ${
                hasResult ? "bg-green-500" : "bg-slate-200"
              }`} />
              <span className="text-xs text-slate-600">Resultado</span>
            </div>
          </div>
        </DialogHeader>

        {/* Enhanced Content with Tabs */}
        <div className="flex-1 overflow-hidden">
          <TooltipProvider>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              {/* Tab Navigation */}
              <div className="border-b border-slate-200 bg-slate-50 px-6">
                <TabsList className="grid w-full max-w-md grid-cols-3 bg-transparent">
                  <TabsTrigger 
                    value="calculator" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculadora
                  </TabsTrigger>
                  <TabsTrigger 
                    value="info"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Info className="mr-2 h-4 w-4" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger 
                    value="references"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Referências
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="h-[calc(90vh-200px)] overflow-y-auto">
                <TabsContent value="calculator" className="mt-0 h-full">
                  <div className="p-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="calculator-form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {renderCalculatorForm()}
                      </motion.div>
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2">
                        {hasResult && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Resetar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Limpar resultados e recalcular
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("info")}
                          className="gap-2"
                        >
                          <Info className="h-4 w-4" />
                          Ver Fórmula
                        </Button>
                        {hasResult && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Copy className="h-4 w-4" />
                                  Copiar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Copiar resultado para área de transferência
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Download className="h-4 w-4" />
                                  Exportar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Exportar resultado como PDF
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="info" className="mt-0">
                  <div className="p-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Info className="h-5 w-5" />
                          Fórmula e Detalhes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="mb-2 font-semibold text-slate-900">Fórmula:</h4>
                          <code className="block whitespace-pre-wrap rounded-lg bg-slate-100 p-4 font-mono text-sm text-slate-700">
                            {calculator.formula}
                          </code>
                        </div>

                        {calculator.details && (
                          <div>
                            <h4 className="mb-2 font-semibold text-slate-900">Detalhes:</h4>
                            <p className="text-sm text-slate-600">{calculator.details}</p>
                          </div>
                        )}

                        {calculator.limitations && (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-yellow-800">Limitações:</h4>
                                <p className="mt-1 text-sm text-yellow-700">
                                  {calculator.limitations}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="references" className="mt-0">
                  <div className="p-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Referências Científicas
                        </CardTitle>
                        <CardDescription>
                          Fontes científicas e diretrizes utilizadas nesta calculadora
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {calculator.references && calculator.references.length > 0 ? (
                          <ol className="space-y-3">
                            {calculator.references.map((reference, index) => (
                              <li key={index} className="flex gap-3">
                                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                                  {index + 1}
                                </span>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {reference}
                                </p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Nenhuma referência específica disponível para esta calculadora.
                          </p>
                        )}

                        <Separator className="my-6" />

                        <div className="rounded-lg bg-blue-50 p-4">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-blue-900">Aviso Médico</h4>
                              <p className="mt-1 text-sm text-blue-800">
                                Esta calculadora é uma ferramenta de apoio à decisão clínica e não substitui 
                                o julgamento médico profissional. Sempre considere o contexto clínico completo 
                                do paciente ao interpretar os resultados.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </TooltipProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}