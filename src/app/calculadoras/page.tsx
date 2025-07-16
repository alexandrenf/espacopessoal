"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  ArrowRight,
  Users,
  Clock,
  Shield,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Heart,
  Activity,
} from "lucide-react";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components_new/ui/separator";

// Import the new calculator system
import {
  CALCULATOR_REGISTRY,
  calculateIMC,
  calculateLDL,
  calculateCKDEPI,
  calculateObstetric,
  obstetricCalculator,
  calculateCardiovascularRisk,
  type IMCInputs,
  type LDLInputs,
  type CKDEPIInputs,
  type ObstetricInputs,
  type CardiovascularRiskInputs,
  type CalculatorInfo,
} from "~/lib/medical-calculators";

// Use the new calculator registry
const calculators = CALCULATOR_REGISTRY;
// Calculator functions are now imported from the refactored modules
// The old inline functions have been replaced with the new modular system

export default function CalculadorasPage() {
  const [selectedCalculator, setSelectedCalculator] = useState<
    (typeof calculators)[0] | null
  >(null);

  // Calculator states
  const [imcInputs, setImcInputs] = useState({ peso: "", altura: "" });
  const [ldlInputs, setLdlInputs] = useState({
    colesterolTotal: "",
    hdl: "",
    triglicerideos: "",
  });
  const [ckdInputs, setCkdInputs] = useState({
    creatinina: "",
    idade: "",
    sexo: "",
  });
  type GestMode = "dum" | "ultrasound" | "conception" | "ivf";

  interface GestInputs {
    dum: string;
    dataAtual: string;
    ultrasoundDate: string;
    ultrasoundWeeks: string;
    ultrasoundDays: string;
    conceptionDate: string;
    transferDate: string;
    embryoAge: string;
  }

  const [gestInputs, setGestInputs] = useState<GestInputs>({
    dum: "",
    dataAtual: new Date().toISOString().split("T")[0]!,
    ultrasoundDate: "",
    ultrasoundWeeks: "",
    ultrasoundDays: "",
    conceptionDate: "",
    transferDate: "",
    embryoAge: "",
  });
  const [gestMode, setGestMode] = useState<GestMode>("dum");
  const [cvRiskInputs, setCvRiskInputs] = useState({
    age: "",
    sex: "",
    totalCholesterol: "",
    hdlCholesterol: "",
    systolicBP: "",
    diabetes: false,
    smoking: false,
    familyHistory: false,
    metabolicSyndrome: false,
    microalbuminuria: "",
    hsCRP: "",
    coronaryCalciumScore: "",
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-24">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/10 blur-3xl" />

        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-5xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-3 text-sm font-semibold text-blue-800 shadow-lg"
            >
              <Calculator className="h-5 w-5" />
              Ferramentas Médicas Avançadas
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-6 text-5xl font-bold leading-tight text-slate-900 md:text-7xl"
            >
              Calculadoras{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Médicas
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-slate-600 md:text-2xl"
            >
              Ferramentas precisas e confiáveis para apoiar suas decisões
              clínicas. Desenvolvidas com base em diretrizes médicas atualizadas
              e validadas clinicamente.
            </motion.p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Baseado em evidências</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Validado clinicamente</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span>Resultados instantâneos</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Calculators Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              Escolha sua Calculadora
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Selecione a ferramenta adequada para sua necessidade clínica
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {calculators.map((calculator, index) => (
              <motion.div
                key={calculator.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group cursor-pointer"
                onClick={() => setSelectedCalculator(calculator)}
              >
                <Card
                  className={`h-full border-2 ${calculator.borderColor} ${calculator.bgColor} transition-all duration-500 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-200/50`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <motion.div
                        whileHover={{ rotate: 5 }}
                        className={`rounded-2xl bg-gradient-to-br ${calculator.color} p-4 text-white shadow-xl`}
                      >
                        {calculator.icon}
                      </motion.div>
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium"
                        >
                          {calculator.category}
                        </Badge>
                        <Badge
                          variant={
                            calculator.popularity === "Muito Popular"
                              ? "default"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {calculator.popularity}
                        </Badge>
                      </div>
                    </div>

                    <CardTitle className="text-2xl font-bold text-slate-900 transition-colors duration-300 group-hover:text-blue-600">
                      {calculator.title}
                    </CardTitle>

                    <CardDescription className="text-base leading-relaxed text-slate-600">
                      {calculator.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {calculator.estimatedTime}
                          </span>
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="shadow-md transition-all duration-300 hover:shadow-lg group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-indigo-500 group-hover:text-white"
                        >
                          Calcular Agora
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Modal */}
      <Dialog
        open={!!selectedCalculator}
        onOpenChange={() => setSelectedCalculator(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="flex items-center gap-4 text-2xl">
              {selectedCalculator && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-xl bg-gradient-to-br ${selectedCalculator.color} p-3 text-white shadow-lg`}
                  >
                    {selectedCalculator.icon}
                  </motion.div>
                  <span className="font-bold">{selectedCalculator.title}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            {selectedCalculator && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Calculator Interface */}
                <div className="space-y-6">
                  {/* IMC Calculator */}
                  {selectedCalculator.id === "imc" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          Calcular IMC
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="peso">Peso (kg)</Label>
                            <Input
                              id="peso"
                              type="number"
                              placeholder="Ex: 70"
                              value={imcInputs.peso}
                              onChange={(e) =>
                                setImcInputs({
                                  ...imcInputs,
                                  peso: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="altura">Altura (m)</Label>
                            <Input
                              id="altura"
                              type="number"
                              step="0.01"
                              placeholder="Ex: 1.75"
                              value={imcInputs.altura}
                              onChange={(e) =>
                                setImcInputs({
                                  ...imcInputs,
                                  altura: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {imcInputs.peso && imcInputs.altura && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="mt-6 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6"
                          >
                            {(() => {
                              const result = calculateIMC({
                                peso: parseFloat(imcInputs.peso),
                                altura: parseFloat(imcInputs.altura),
                              });
                              if (!result.success) {
                                return (
                                  <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="h-5 w-5" />
                                    <span>{result.error}</span>
                                  </div>
                                );
                              }

                              return (
                                <div className="text-center">
                                  <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="mb-2 text-4xl font-bold text-blue-600"
                                  >
                                    {result.imc}
                                  </motion.div>
                                  <div
                                    className={`text-xl font-semibold ${result.cor} mb-2`}
                                  >
                                    {result.classificacao}
                                  </div>
                                  <div className="rounded-lg bg-white/50 p-2 text-sm text-slate-600">
                                    {result.formula ?? `IMC = ${imcInputs.peso} ÷ (${imcInputs.altura})² = ${result.imc}`}
                                  </div>
                                  {result.warnings && result.warnings.length > 0 && (
                                    <div className="mt-2 text-sm text-yellow-600">
                                      {result.warnings.join("; ")}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* LDL Calculator */}
                  {selectedCalculator.id === "ldl" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="h-5 w-5" />
                          Calcular LDL
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="colesterolTotal">
                              Colesterol Total (mg/dL)
                            </Label>
                            <Input
                              id="colesterolTotal"
                              type="number"
                              placeholder="Ex: 200"
                              value={ldlInputs.colesterolTotal}
                              onChange={(e) =>
                                setLdlInputs({
                                  ...ldlInputs,
                                  colesterolTotal: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="hdl">HDL (mg/dL)</Label>
                            <Input
                              id="hdl"
                              type="number"
                              placeholder="Ex: 50"
                              value={ldlInputs.hdl}
                              onChange={(e) =>
                                setLdlInputs({
                                  ...ldlInputs,
                                  hdl: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="triglicerideos">
                              Triglicerídeos (mg/dL)
                            </Label>
                            <Input
                              id="triglicerideos"
                              type="number"
                              placeholder="Ex: 150"
                              value={ldlInputs.triglicerideos}
                              onChange={(e) =>
                                setLdlInputs({
                                  ...ldlInputs,
                                  triglicerideos: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {ldlInputs.colesterolTotal &&
                          ldlInputs.hdl &&
                          ldlInputs.triglicerideos && (
                            <div className="mt-6 rounded-lg border bg-gradient-to-r from-red-50 to-pink-50 p-4">
                              {(() => {
                                const result = calculateLDL({
                                  colesterolTotal: parseFloat(ldlInputs.colesterolTotal),
                                  hdl: parseFloat(ldlInputs.hdl),
                                  triglicerideos: parseFloat(ldlInputs.triglicerideos),
                                });
                                return (
                                  <div className="text-center">
                                    {result.error ? (
                                      <div className="flex items-center gap-2 text-red-600">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="text-sm">
                                          {result.error}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="mb-2 text-3xl font-bold text-red-600">
                                          {result.ldl} mg/dL
                                        </div>
                                        <div
                                          className={`text-lg font-semibold ${result.cor} mb-1`}
                                        >
                                          {result.classificacao}
                                        </div>
                                        <div className="text-sm text-slate-600">
                                          LDL = {ldlInputs.colesterolTotal} -{" "}
                                          {ldlInputs.hdl} - (
                                          {ldlInputs.triglicerideos}/5)
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  )}

                  {/* CKD-EPI Calculator */}
                  {selectedCalculator.id === "ckd-epi" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Calcular TFG (CKD-EPI 2021)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="creatinina">
                              Creatinina Sérica (mg/dL)
                            </Label>
                            <Input
                              id="creatinina"
                              type="number"
                              step="0.01"
                              placeholder="Ex: 1.2"
                              value={ckdInputs.creatinina}
                              onChange={(e) =>
                                setCkdInputs({
                                  ...ckdInputs,
                                  creatinina: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="idade">Idade (anos)</Label>
                            <Input
                              id="idade"
                              type="number"
                              placeholder="Ex: 45"
                              value={ckdInputs.idade}
                              onChange={(e) =>
                                setCkdInputs({
                                  ...ckdInputs,
                                  idade: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="sexo">Sexo</Label>
                            <Select
                              value={ckdInputs.sexo}
                              onValueChange={(value) =>
                                setCkdInputs({ ...ckdInputs, sexo: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione o sexo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="F">Feminino</SelectItem>
                                <SelectItem value="M">Masculino</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {ckdInputs.creatinina &&
                          ckdInputs.idade &&
                          ckdInputs.sexo && (
                            <div className="mt-6 rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                              {(() => {
                                const result = calculateCKDEPI({
                                  creatinina: parseFloat(ckdInputs.creatinina),
                                  idade: parseFloat(ckdInputs.idade),
                                  sexo: ckdInputs.sexo as "M" | "F",
                                });
                                return (
                                  <div className="text-center">
                                    <div className="mb-2 text-3xl font-bold text-green-600">
                                      {result.eGFR} mL/min/1.73m²
                                    </div>
                                    <div
                                      className={`text-lg font-semibold ${result.cor} mb-1`}
                                    >
                                      {result.classificacao}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                      CKD-EPI 2021 (sem coeficiente racial)
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Obstetric Calculator */}
                  {selectedCalculator.id === "idade-gestacional" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5" />
                          Cálculos Obstétricos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="gestMode">Método de Cálculo</Label>
                            <Select value={gestMode} onValueChange={(value) => setGestMode(value as GestMode)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione o método" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dum">Por DUM</SelectItem>
                                <SelectItem value="ultrasound">Por Ultrassom</SelectItem>
                                <SelectItem value="conception">Por Data de Concepção</SelectItem>
                                <SelectItem value="ivf">Por Transferência de Embrião (FIV)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="dataAtual">Data Atual</Label>
                            <Input
                              id="dataAtual"
                              type="date"
                              value={gestInputs.dataAtual}
                              onChange={(e) =>
                                setGestInputs({ ...gestInputs, dataAtual: e.target.value })
                              }
                              className="mt-1"
                            />
                          </div>
                          {gestMode === "dum" && (
                            <div>
                              <Label htmlFor="dum">Data da Última Menstruação (DUM)</Label>
                              <Input
                                id="dum"
                                type="date"
                                value={gestInputs.dum}
                                onChange={(e) =>
                                  setGestInputs({ ...gestInputs, dum: e.target.value })
                                }
                                className="mt-1"
                              />
                            </div>
                          )}
                          {gestMode === "ultrasound" && (
                            <>
                              <div>
                                <Label htmlFor="ultrasoundDate">Data do Ultrassom</Label>
                                <Input
                                  id="ultrasoundDate"
                                  type="date"
                                  value={gestInputs.ultrasoundDate}
                                  onChange={(e) =>
                                    setGestInputs({ ...gestInputs, ultrasoundDate: e.target.value })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="ultrasoundWeeks">Semanas no Ultrassom</Label>
                                <Input
                                  id="ultrasoundWeeks"
                                  type="number"
                                  value={gestInputs.ultrasoundWeeks}
                                  onChange={(e) =>
                                    setGestInputs({ ...gestInputs, ultrasoundWeeks: e.target.value })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="ultrasoundDays">Dias no Ultrassom</Label>
                                <Input
                                  id="ultrasoundDays"
                                  type="number"
                                  min="0"
                                  max="6"
                                  value={gestInputs.ultrasoundDays}
                                  onChange={(e) =>
                                    setGestInputs({ ...gestInputs, ultrasoundDays: e.target.value })
                                  }
                                  className="mt-1"
                                />
                              </div>
                            </>
                          )}
                          {gestMode === "conception" && (
                            <div>
                              <Label htmlFor="conceptionDate">Data da Concepção</Label>
                              <Input
                                id="conceptionDate"
                                type="date"
                                value={gestInputs.conceptionDate}
                                onChange={(e) =>
                                  setGestInputs({ ...gestInputs, conceptionDate: e.target.value })
                                }
                                className="mt-1"
                              />
                            </div>
                          )}
                          {gestMode === "ivf" && (
                            <>
                              <div>
                                <Label htmlFor="transferDate">Data da Transferência</Label>
                                <Input
                                  id="transferDate"
                                  type="date"
                                  value={gestInputs.transferDate}
                                  onChange={(e) =>
                                    setGestInputs({ ...gestInputs, transferDate: e.target.value })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="embryoAge">Idade do Embrião (dias)</Label>
                                <Select
                                  value={gestInputs.embryoAge}
                                  onValueChange={(value) =>
                                    setGestInputs({ ...gestInputs, embryoAge: value })
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="3">3 dias</SelectItem>
                                    <SelectItem value="5">5 dias</SelectItem>
                                    <SelectItem value="6">6 dias</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>

                        {(() => {
                          const hasRequiredInputs = () => {
                            if (!gestInputs.dataAtual) return false;
                            switch (gestMode) {
                              case "dum":
                                return !!gestInputs.dum;
                              case "ultrasound":
                                return (
                                  !!gestInputs.ultrasoundDate &&
                                  !!gestInputs.ultrasoundWeeks &&
                                  !!gestInputs.ultrasoundDays
                                );
                              case "conception":
                                return !!gestInputs.conceptionDate;
                              case "ivf":
                                return !!gestInputs.transferDate && !!gestInputs.embryoAge;
                              default:
                                return false;
                            }
                          };

                          if (!hasRequiredInputs()) return null;

                          let result;
                          switch (gestMode) {
                            case "dum":
                              if (!gestInputs.dum) return null;
                              result = obstetricCalculator.calculate({
                                mode: "dum",
                                dum: gestInputs.dum,
                                currentDate: gestInputs.dataAtual,
                              });
                              break;
                            case "ultrasound":
                              if (!gestInputs.ultrasoundDate || !gestInputs.ultrasoundWeeks || !gestInputs.ultrasoundDays) return null;
                              result = obstetricCalculator.calculate({
                                mode: "ultrasound",
                                ultrasoundDate: gestInputs.ultrasoundDate,
                                ultrasoundWeeks: parseInt(gestInputs.ultrasoundWeeks),
                                ultrasoundDays: parseInt(gestInputs.ultrasoundDays),
                                currentDate: gestInputs.dataAtual,
                              });
                              break;
                            case "conception":
                              if (!gestInputs.conceptionDate) return null;
                              result = obstetricCalculator.calculate({
                                mode: "conception",
                                conceptionDate: gestInputs.conceptionDate,
                                currentDate: gestInputs.dataAtual,
                              });
                              break;
                            case "ivf":
                              if (!gestInputs.transferDate || !gestInputs.embryoAge) return null;
                              result = obstetricCalculator.calculate({
                                mode: "ivf",
                                transferDate: gestInputs.transferDate,
                                embryoAge: parseInt(gestInputs.embryoAge),
                                currentDate: gestInputs.dataAtual,
                              });
                              break;
                          }

                          if (!result.success) {
                            return (
                              <div className="mt-6 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-6">
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertCircle className="h-5 w-5" />
                                  <span>{result.error}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              className="mt-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 p-6"
                            >
                              <div className="space-y-3">
                                <div className="text-center">
                                  <div className="mb-2 text-3xl font-bold text-purple-600">
                                    {result.gestationalAge}
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    {result.weeks} semanas e {result.days} dias
                                  </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-semibold">DUM efetiva:</span> {result.effectiveDUM}
                                  </div>
                                  <div>
                                    <span className="font-semibold">DPP:</span> {result.dpp}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Dias totais:</span> {result.totalDays}
                                  </div>
                                  <div>
                                    <span className="font-semibold">IG:</span> {result.gestationalAge}
                                  </div>
                                </div>
                                {result.method && (
                                  <div className="mt-4 text-center">
                                    <Badge variant="secondary">Método: {result.method}</Badge>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Cardiovascular Risk Calculator */}
                  {selectedCalculator.id === "risco-cardiovascular" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Calcular Risco Cardiovascular
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="cvAge">Idade (anos)</Label>
                            <Input
                              id="cvAge"
                              type="number"
                              placeholder="Ex: 55"
                              value={cvRiskInputs.age}
                              onChange={(e) =>
                                setCvRiskInputs({
                                  ...cvRiskInputs,
                                  age: e.target.value,
                                })
                              }
                              className="mt-1"
                              min="40"
                              max="74"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cvSex">Sexo</Label>
                            <Select
                              value={cvRiskInputs.sex}
                              onValueChange={(value) =>
                                setCvRiskInputs({ ...cvRiskInputs, sex: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione o sexo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="F">Feminino</SelectItem>
                                <SelectItem value="M">Masculino</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="cvTotalChol">
                              Colesterol Total (mg/dL)
                            </Label>
                            <Input
                              id="cvTotalChol"
                              type="number"
                              placeholder="Ex: 200"
                              value={cvRiskInputs.totalCholesterol}
                              onChange={(e) =>
                                setCvRiskInputs({
                                  ...cvRiskInputs,
                                  totalCholesterol: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cvHDL">HDL (mg/dL)</Label>
                            <Input
                              id="cvHDL"
                              type="number"
                              placeholder="Ex: 50"
                              value={cvRiskInputs.hdlCholesterol}
                              onChange={(e) =>
                                setCvRiskInputs({
                                  ...cvRiskInputs,
                                  hdlCholesterol: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cvSystolic">
                              Pressão Sistólica (mmHg)
                            </Label>
                            <Input
                              id="cvSystolic"
                              type="number"
                              placeholder="Ex: 130"
                              value={cvRiskInputs.systolicBP}
                              onChange={(e) =>
                                setCvRiskInputs({
                                  ...cvRiskInputs,
                                  systolicBP: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Fatores de Risco</Label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cvRiskInputs.diabetes}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      diabetes: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">Diabetes</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cvRiskInputs.smoking}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      smoking: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">Tabagismo</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold">
                            Fatores Agravantes (Opcionais)
                          </h4>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cvRiskInputs.familyHistory}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      familyHistory: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  História familiar precoce de DCV
                                </span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cvRiskInputs.metabolicSyndrome}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      metabolicSyndrome: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  Síndrome metabólica
                                </span>
                              </label>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <Label htmlFor="cvMicro" className="text-sm">
                                  Microalbuminúria (mg/g)
                                </Label>
                                <Input
                                  id="cvMicro"
                                  type="number"
                                  placeholder="Ex: 50"
                                  value={cvRiskInputs.microalbuminuria}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      microalbuminuria: e.target.value,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="cvCRP" className="text-sm">
                                  PCR-us (mg/L)
                                </Label>
                                <Input
                                  id="cvCRP"
                                  type="number"
                                  placeholder="Ex: 2.5"
                                  value={cvRiskInputs.hsCRP}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      hsCRP: e.target.value,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="cvCalcium" className="text-sm">
                                  Escore de Cálcio
                                </Label>
                                <Input
                                  id="cvCalcium"
                                  type="number"
                                  placeholder="Ex: 150"
                                  value={cvRiskInputs.coronaryCalciumScore}
                                  onChange={(e) =>
                                    setCvRiskInputs({
                                      ...cvRiskInputs,
                                      coronaryCalciumScore: e.target.value,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {cvRiskInputs.age &&
                          cvRiskInputs.sex &&
                          cvRiskInputs.totalCholesterol &&
                          cvRiskInputs.hdlCholesterol &&
                          cvRiskInputs.systolicBP && (
                            <div className="mt-6 rounded-lg border bg-gradient-to-r from-orange-50 to-red-50 p-4">
                              {(() => {
                                const result = calculateCardiovascularRisk({
                                  age: parseFloat(cvRiskInputs.age),
                                  sex: cvRiskInputs.sex as "M" | "F",
                                  totalCholesterol: parseFloat(cvRiskInputs.totalCholesterol),
                                  hdlCholesterol: parseFloat(cvRiskInputs.hdlCholesterol),
                                  systolicBP: parseFloat(cvRiskInputs.systolicBP),
                                  diabetes: cvRiskInputs.diabetes,
                                  smoking: cvRiskInputs.smoking,
                                  familyHistory: cvRiskInputs.familyHistory,
                                  metabolicSyndrome: cvRiskInputs.metabolicSyndrome,
                                  microalbuminuria: cvRiskInputs.microalbuminuria
                                    ? parseFloat(cvRiskInputs.microalbuminuria)
                                    : undefined,
                                  hsCRP: cvRiskInputs.hsCRP
                                    ? parseFloat(cvRiskInputs.hsCRP)
                                    : undefined,
                                  coronaryCalciumScore: cvRiskInputs.coronaryCalciumScore
                                    ? parseFloat(cvRiskInputs.coronaryCalciumScore)
                                    : undefined,
                                });

                                if ("error" in result) {
                                  return (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <AlertCircle className="h-5 w-5" />
                                      <span>{result.error}</span>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-4">
                                    <div className="text-center">
                                      <div className="mb-2 text-3xl font-bold text-orange-600">
                                        {result.riskPercentage}%
                                      </div>
                                      <div
                                        className={`text-lg font-semibold ${result.riskColor} mb-1`}
                                      >
                                        Risco {result.riskCategory}
                                      </div>
                                      {result.automaticHighRiskReason && (
                                        <div className="mt-2 text-sm text-red-600">
                                          Condição de alto risco:{" "}
                                          {result.automaticHighRiskReason}
                                        </div>
                                      )}
                                      {result.reclassified && (
                                        <div className="mt-2 text-sm text-orange-600">
                                          Reclassificado devido a fatores
                                          agravantes
                                        </div>
                                      )}
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                      <h5 className="text-sm font-semibold">
                                        Metas Terapêuticas:
                                      </h5>
                                      <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">
                                            LDL-c:
                                          </span>
                                          <span className="font-medium">
                                            {result.therapeuticTargets?.ldl}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">
                                            Pressão Arterial:
                                          </span>
                                          <span className="font-medium">
                                            {
                                              result.therapeuticTargets
                                                ?.bloodPressure
                                            }
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">
                                            Reavaliação em:
                                          </span>
                                          <span className="font-medium">
                                            {result.therapeuticTargets?.followUp}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {result.aggravatingFactors &&
                                      result.aggravatingFactors.length > 0 && (
                                        <>
                                          <Separator />
                                          <div className="space-y-2">
                                            <h5 className="text-sm font-semibold">
                                              Fatores Agravantes Presentes:
                                            </h5>
                                            <ul className="space-y-1 text-sm text-slate-600">
                                              {result.aggravatingFactors.map(
                                                (factor, index) => (
                                                  <li
                                                    key={index}
                                                    className="flex items-center gap-2"
                                                  >
                                                    <CheckCircle className="h-4 w-4 text-orange-500" />
                                                    {factor}
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        </>
                                      )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Information Panel */}
                <div className="space-y-6">
                  {/* Formula Display */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Fórmula</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="block whitespace-pre-wrap rounded bg-slate-100 p-3 font-mono text-sm text-slate-700">
                        {selectedCalculator.formula}
                      </code>

                      {selectedCalculator.details && (
                        <div className="mt-3">
                          <p className="mb-1 text-sm font-semibold text-slate-600">
                            Onde:
                          </p>
                          <p className="text-sm text-slate-600">
                            {selectedCalculator.details}
                          </p>
                        </div>
                      )}

                      {selectedCalculator.limitations && (
                        <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Limitações:</strong>{" "}
                            {selectedCalculator.limitations}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  {selectedCalculator.id === "ckd-epi" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-900">
                          CKD-EPI 2021
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Versão mais recente (2021)</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Sem coeficiente racial</span>
                        </div>
                        <div className="mt-3">
                          <p className="mb-2 font-semibold">Parâmetros:</p>
                          <ul className="space-y-1 text-slate-600">
                            <li>• Scr = creatinina sérica (mg/dL)</li>
                            <li>• κ = 0.7 (mulheres) ou 0.9 (homens)</li>
                            <li>• α = -0.241 (mulheres) ou -0.302 (homens)</li>
                            <li>• min = mínimo entre Scr/κ ou 1</li>
                            <li>• max = máximo entre Scr/κ ou 1</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCalculator.id === "idade-gestacional" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-900">
                          Métodos de Cálculo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div>
                          <p className="mb-1 font-semibold">1. Por DUM:</p>
                          <p className="text-slate-600">
                            IG = (Data atual - DUM) / 7
                          </p>
                          <p className="text-slate-600">DPP = DUM + 280 dias</p>
                        </div>
                        <div>
                          <p className="mb-1 font-semibold">
                            2. Por Ultrassom:
                          </p>
                          <p className="text-slate-600">
                            DUM corrigida = Data do exame - (IG no exame × 7)
                          </p>
                          <p className="text-slate-600">
                            DPP corrigida = DUM corrigida + 280 dias
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 font-semibold">
                            3. Prioridade para Datação:
                          </p>
                          <ul className="space-y-1 text-slate-600">
                            <li>• 1º trimestre: Ultrassom é mais preciso</li>
                            <li>
                              • 2º trimestre: Ultrassom se diferença &gt; 1
                              semana
                            </li>
                            <li>
                              • 3º trimestre: Ultrassom se diferença &gt; 2
                              semanas
                            </li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCalculator.id === "ldl" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-red-900">
                          Observações Importantes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Fórmula de Friedewald: Válida apenas para TG &lt;
                            400 mg/dL
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>
                            Alternativa: Fórmula de Martin-Hopkins se TG &gt;
                            400 mg/dL
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Unidades: Todos os valores em mg/dL</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCalculator.id === "risco-cardiovascular" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-orange-900">
                          Risco Cardiovascular SBC
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Baseado no Escore de Framingham</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Adaptado para população brasileira</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Diretrizes SBC 2020</span>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <p className="mb-2 font-semibold">
                            Critérios de Inclusão:
                          </p>
                          <ul className="space-y-1 text-slate-600">
                            <li>• Idade: 40-74 anos</li>
                            <li>• Prevenção primária</li>
                            <li>• Sem condições de alto risco automático</li>
                          </ul>
                        </div>

                        <div>
                          <p className="mb-2 font-semibold">
                            Condições de Alto Risco Automático:
                          </p>
                          <ul className="space-y-1 text-slate-600">
                            <li>• DCV aterosclerótica manifesta</li>
                            <li>• Diabetes com fatores de risco adicionais</li>
                            <li>• DRC com TFG {"<"} 60 mL/min/1.73m²</li>
                            <li>• Hipercolesterolemia familiar</li>
                            <li>• LDL-c ≥ 190 mg/dL</li>
                          </ul>
                        </div>

                        <div>
                          <p className="mb-2 font-semibold">Pontos de Corte:</p>
                          <div className="grid grid-cols-2 gap-2 text-slate-600">
                            <div>
                              <p className="font-medium">Homens:</p>
                              <ul className="space-y-1 text-xs">
                                <li>• Baixo: {"<"} 10%</li>
                                <li>• Intermediário: 10-20%</li>
                                <li>• Alto: ≥ 20%</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium">Mulheres:</p>
                              <ul className="space-y-1 text-xs">
                                <li>• Baixo: {"<"} 5%</li>
                                <li>• Intermediário: 5-10%</li>
                                <li>• Alto: ≥ 10%</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
