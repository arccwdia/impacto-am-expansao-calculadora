import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Moon, Sun, ArrowRight, Lock, Calculator, Download, TrendingUp, ChevronDown, Users, Briefcase, Calendar, DollarSign, BarChart4, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';
import './animations.css';

// --- DADOS E CONSTANTES (AGORA AUTOCONTIDOS NESTE ARQUIVO) ---

const PRICE_TABLE = {
  Offline: [{ QTD: 10, Valor: 79 }, { QTD: 30, Valor: 168 }, { QTD: 50, Valor: 255 }, { QTD: 100, Valor: 460 }, { QTD: 300, Valor: 1170 }],
  Basic: [{ QTD: 10, Valor: 79 }, { QTD: 30, Valor: 168 }, { QTD: 50, Valor: 255 }, { QTD: 100, Valor: 460 }, { QTD: 300, Valor: 1170 }],
  Pro: [{ QTD: 10, Valor: 89 }, { QTD: 30, Valor: 204 }, { QTD: 50, Valor: 290 }, { QTD: 100, Valor: 530 }, { QTD: 300, Valor: 1410 }],
  Ultimate: [{ QTD: 10, Valor: 99 }, { QTD: 30, Valor: 234 }, { QTD: 50, Valor: 340 }, { QTD: 100, Valor: 610 }, { QTD: 300, Valor: 1620 }],
  'Ultimate Plus': [{ QTD: 10, Valor: 99 }, { QTD: 30, Valor: 234 }, { QTD: 50, Valor: 340 }, { QTD: 100, Valor: 610 }, { QTD: 300, Valor: 1620 }],
};

const MODULES = {
  ga: { label: 'Gestão de Arquivos', defaultUnit: 1.50 },
  fe: { label: 'Controle de Férias', defaultUnit: 1.20 },
  pv: { label: 'Ponto Virtual', defaultUnit: 39.90 },
};

const COMBO_PRICE_PER_USER = 2.50;
const ANNUAL_DISCOUNTS = { avista: 0.15, boleto4x: 0.12, cartao12x: 0.07 };
const PLAN_OPTIONS = ['Offline', 'Basic', 'Pro', 'Ultimate', 'Ultimate Plus'];


const AUTH_PIN = 'Nereide0165@CS';
const AUTH_STORAGE_KEY = 'calculatorAuth';

// --- ESTADO INICIAL ---

const today = new Date().toISOString().split('T')[0];

const initialState = {
  profile: 'expansao', // 'expansao' | 'retencao'
  mode: 'mensal',
  currentEmployees: 30,
  newEmployees: 30,
  currentPlan: 'Pro',
  newPlan: 'Pro',
  includeGA: false,
  gaUnit: MODULES.ga.defaultUnit,
  includeFE: false,
  feUnit: MODULES.fe.defaultUnit,
  includePV: false,
  pvUnit: MODULES.pv.defaultUnit,
  pvQty: 1,
  preservarBase: false,
  systemPerUser: '',
  mensalInicio: today,
  mensalFim: today,
  mensalAlteracao: today,
  anualInicio: today,
  anualFim: today,
  anualAlteracao: today,
  mensalAtualManual: '',
  creditMensalManual: '',
  creditMensalManualActive: false,
  valorAnualPago: '',
  creditAnualManual: '',
  creditAnualManualActive: false,
  creditAnualApplied: '',
  currentHasGA: false,
  currGAAnnual: '',
  currentHasFE: false,
  currFEAnnual: '',
  currentHasPV: false,
  currPVAnnual: '',
  currentPvQty: 1,
  discountOnModulesOnly: false, // Novo estado para controlar o desconto
  selectedPayment: 'avista', // 'avista', 'boleto4x', 'cartao12x'
  isMigratingFromMensal: false,
  isMigratingFromAnual: false,
  // Retenção: condições personalizadas (anual)
  useCustomPayment: false,
  customSignal: '',
  customParcelsCount: 0,
  customParcelValue: '',
  // Dados do cliente para personalização
  clientName: '',
  clientCNPJ: '',
};

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const round = (value) => Math.round(value * 100) / 100;

function findBracket(plan, qtd) {
  const planKey = plan.replace(' (Offline)', '')
  const table = PRICE_TABLE[planKey];
  if (!table) return { QTD: qtd, Valor: 0 };
  return table.find(r => r.QTD >= qtd) ?? table[table.length - 1];
}

function daysBetween(startISO, endISO) {
  const startDate = new Date(startISO + 'T00:00:00');
  const endDate = new Date(endISO + 'T00:00:00');
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function computeProportionalCredit(start, end, change, value) {
  const totalDays = daysBetween(start, end);
  if (totalDays <= 0) return 0;
  const unusedDays = daysBetween(change, end);
  const credit = value * (unusedDays / totalDays);
  return round(Math.max(0, Math.min(value, credit)));
}

// Helper function to parse number input, handling comma as decimal separator
const parseNumberInput = (valueAsString) => {
  if (valueAsString === '' || valueAsString === null) return '';
  let cleanedValue = String(valueAsString)
    .trim()
    .replace(/[^\d,.-]/g, '') // Remove símbolos como R$, espaços e letras
    .replace(/(?!^)-/g, ''); // Mantém apenas o primeiro sinal negativo, se houver

  if (cleanedValue === '' || cleanedValue === '-' || cleanedValue === ',' || cleanedValue === '.') {
    return '';
  }

  const isNegative = cleanedValue.startsWith('-');
  cleanedValue = cleanedValue.replace(/-/g, '');

  const hasComma = cleanedValue.includes(',');
  const hasDot = cleanedValue.includes('.');

  if (hasComma) {
    // Padrão brasileiro: remove pontos de milhar e usa vírgula como decimal
    cleanedValue = cleanedValue.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const lastDotIndex = cleanedValue.lastIndexOf('.');
    const decimals = cleanedValue.length - lastDotIndex - 1;
    if (decimals === 0) {
      cleanedValue = cleanedValue.replace(/\./g, '');
    } else if (decimals > 2) {
      // Considera pontos como separadores de milhar
      cleanedValue = cleanedValue.replace(/\./g, '');
    }
    // Caso contrário, mantém o ponto como separador decimal (formato en-US)
  }

  if (cleanedValue === '') return '';

  const num = parseFloat((isNegative ? '-' : '') + cleanedValue);
  return isNaN(num) ? '' : num;
};

  const toNumber = (value, fallback = 0) => {
    const parsed = parseNumberInput(value);
    return parsed === '' ? fallback : parsed;
  };

// --- COMPONENTES DE UI MODERNOS (Design System) ---
const Input = (props) => (
  <input
    {...props}
    className={`
      flex h-11 w-full rounded-lg border 
      border-slate-200 dark:border-neutral-800 
      bg-white dark:bg-neutral-900 
      px-4 py-3 text-sm
      placeholder:text-slate-400 dark:placeholder:text-neutral-500
      focus:outline-none focus:ring-2 
      focus:ring-blue-500/50 dark:focus:ring-blue-400/50
      focus:border-blue-500 dark:focus:border-blue-400
      disabled:cursor-not-allowed disabled:opacity-50
      transition-all duration-200
      ${props.className || ''}
    `}
  />
);

const Select = (props) => (
  <select
    {...props}
    className={`
      flex h-11 w-full rounded-lg border 
      border-slate-200 dark:border-neutral-800 
      bg-white dark:bg-neutral-900 
      px-4 py-3 text-sm 
      focus:outline-none focus:ring-2 
      focus:ring-blue-500/50 dark:focus:ring-blue-400/50
      focus:border-blue-500 dark:focus:border-blue-400
      disabled:cursor-not-allowed disabled:opacity-50
      appearance-none
      bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik01Ljk5OTg5IDQuOTc2NzFMMTAuMTI0OSAwLjg1MTcwOEwxMS4zMDMyIDIuMDI5OTZMNi4wMDAwNyA3LjMzMzA4TDAuNjk2NzUyIDIuMDI5OTZMMi4xMTc2MSAwLjg1MTcwOEw1Ljk5OTg5IDQuOTc2NzFaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==')]
      bg-[center_right_1rem] bg-no-repeat
      transition-all duration-200
      ${props.className || ''}
    `}
  >
    {props.children}
  </select>
);

const Label = ({ htmlFor, children, className }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium leading-none mb-2 block peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300 ${className || ''}`}>
    {children}
  </label>
);

const Card = ({ children, className }) => (
  <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-slate-100 dark:border-neutral-800 p-6 backdrop-blur-sm backdrop-saturate-150 transition-all duration-300 ${className || ''}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className }) => (
  <div className={`mb-5 ${className || ''}`}>{children}</div>
);

const CardTitle = ({ children, className }) => (
  <h2 className={`text-xl font-bold tracking-tight relative ${className || ''}`}>
    <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{children}</span>
  </h2>
);

const CardContent = ({ children, className }) => (
  <div className={`space-y-4 ${className || ''}`}>{children}</div>
);

const Button = (props) => {
  const { variant = 'default', size = 'default', className = '', ...rest } = props;
  
  let baseClasses = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-neutral-900';
  
  if (size === 'sm') baseClasses += ' h-9 px-3';
  else baseClasses += ' h-11 px-5 py-3';

  if (variant === 'default') baseClasses += ' bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-md hover:shadow-lg hover:shadow-blue-500/20';
  else if (variant === 'outline') baseClasses += ' border border-slate-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 dark:text-neutral-100 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-300 dark:hover:border-neutral-600';
  else if (variant === 'ghost') baseClasses += ' hover:bg-slate-100 dark:hover:bg-neutral-800';

  return <button className={`${baseClasses} ${className}`} {...rest}>{props.children}</button>;
};

const Switch = ({ checked, onCheckedChange, id }) => (
  <label htmlFor={id} className="flex items-center cursor-pointer">
    <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
    <span className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${checked ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-slate-200 dark:bg-neutral-700'}`}>
      <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-spring ${checked ? 'translate-x-5' : ''}`}></span>
    </span>
  </label>
);

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ${className || ''}`}>
    {children}
  </span>
);

const Row = ({ label, value, className = '' }) => (
  <div className={`flex items-center justify-between text-sm py-1 ${className}`}>
    <span className="text-slate-600 dark:text-slate-400">{label}</span>
    <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </span>
  </div>
);

const LoginScreen = ({ onAuth }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulação de loading para melhor UX
    setTimeout(() => {
      if (pin === AUTH_PIN) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        onAuth(true);
      } else {
        setError('PIN incorreto. Tente novamente.');
        setPin('');
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Elementos decorativos */}
        <div className="absolute -z-10 blur-3xl opacity-30 dark:opacity-10 bg-blue-300 dark:bg-blue-700 rounded-full w-64 h-64 -top-10 -left-10"></div>
        <div className="absolute -z-10 blur-3xl opacity-30 dark:opacity-10 bg-purple-300 dark:bg-purple-700 rounded-full w-64 h-64 -bottom-10 -right-10"></div>
        
        <form onSubmit={handleSubmit}>
          <Card className="p-8 backdrop-blur-sm backdrop-saturate-150">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="grid place-content-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30 mb-5 rotate-3">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-neutral-50 mb-2">Acesso Restrito</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Insira o PIN de acesso para utilizar a calculadora AM Expansão.</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="pin" className="sr-only">PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Digite seu PIN"
                maxLength={15}
                className="w-full p-3 text-center text-xl tracking-widest bg-slate-50 dark:bg-neutral-800/50 border-slate-200 dark:border-neutral-700 focus:border-blue-500"
                autoFocus
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="p-3 mb-4 text-sm border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/30 text-red-600 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full font-semibold py-3 text-base"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Acessar Calculadora'}
            </Button>
            
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-6">
              © 2025 AM Sistemas • Calculadora de Expansão
            </p>
          </Card>
        </form>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---

export default function App() {
  const [theme, setTheme] = useState('light');
  const [authOk, setAuthOk] = useState(sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true');
  const [state, setState] = useState(initialState);

  const updateState = (key, value) => {
    // Atualiza imediatamente o estado visual para o input
    // Regras específicas para créditos manuais: ativar automaticamente ao editar
    if (key === 'creditAnualManual') {
      const parsed = parseNumberInput(value);
      setState(prevState => ({
        ...prevState,
        [key]: value,
        creditAnualManualActive: parsed !== '',
        creditAnualApplied: parsed === '' ? '' : prevState.creditAnualApplied,
      }));
      return;
    }
    if (key === 'creditMensalManual') {
      const parsed = parseNumberInput(value);
      setState(prevState => ({
        ...prevState,
        [key]: value,
        creditMensalManualActive: parsed !== '',
      }));
      return;
    }

    setState(prevState => ({ ...prevState, [key]: value }));
  };
  
  const updateStateInstant = (key, value) => {
    setState(prevState => ({ ...prevState, [key]: value }));
  };

  const currentEmployeesCount = useMemo(() => toNumber(state.currentEmployees, 0), [state.currentEmployees]);
  const newEmployeesCount = useMemo(() => toNumber(state.newEmployees, 0), [state.newEmployees]);
  const pvQtyValue = useMemo(() => toNumber(state.pvQty, 0), [state.pvQty]);
  const currentPvQtyValue = useMemo(() => toNumber(state.currentPvQty, 0), [state.currentPvQty]);
  const gaUnitValue = useMemo(() => toNumber(state.gaUnit, MODULES.ga.defaultUnit), [state.gaUnit]);
  const feUnitValue = useMemo(() => toNumber(state.feUnit, MODULES.fe.defaultUnit), [state.feUnit]);
  const pvUnitValue = useMemo(() => toNumber(state.pvUnit, MODULES.pv.defaultUnit), [state.pvUnit]);
  const systemPerUserValue = useMemo(() => {
    const parsed = parseNumberInput(state.systemPerUser);
    return parsed === '' ? null : parsed;
  }, [state.systemPerUser]);
  const manualMensalCreditValue = useMemo(() => {
    const parsed = parseNumberInput(state.creditMensalManual);
    const result = parsed === '' ? null : parsed;
    return result;
  }, [state.creditMensalManual]);
  const manualAnualCreditValue = useMemo(() => {
    const parsed = parseNumberInput(state.creditAnualManual);
    const result = parsed === '' ? null : parsed;
    return result;
  }, [state.creditAnualManual]);

  // Valor aplicado explicitamente pelo botão (string armazenada no estado)
  const manualAnualAppliedValue = useMemo(() => {
    const parsed = parseNumberInput(state.creditAnualApplied);
    return parsed === '' ? null : parsed;
  }, [state.creditAnualApplied]);

  // Valores personalizados (Retenção)
  const customSignalValue = useMemo(() => toNumber(state.customSignal, 0), [state.customSignal]);
  const customParcelsCountValue = useMemo(() => Number(state.customParcelsCount) || 0, [state.customParcelsCount]);
  const customParcelValue = useMemo(() => toNumber(state.customParcelValue, 0), [state.customParcelValue]);
  const customPaymentTotal = useMemo(() => round(Math.max(0, customSignalValue + (customParcelsCountValue * customParcelValue))), [customSignalValue, customParcelsCountValue, customParcelValue]);

  // --- CÁLCULOS DE VALORES ATUAIS ---
  const currentGaMensal = useMemo(() => {
    if (!state.currentHasGA) return 0;
    return round(MODULES.ga.defaultUnit * currentEmployeesCount);
  }, [state.currentHasGA, currentEmployeesCount]);

  const currentFeMensal = useMemo(() => {
    if (!state.currentHasFE) return 0;
    return round(MODULES.fe.defaultUnit * currentEmployeesCount);
  }, [state.currentHasFE, currentEmployeesCount]);

  const currentPvMensal = useMemo(() => {
    if (!state.currentHasPV) return 0;
    return round(pvUnitValue * currentPvQtyValue);
  }, [state.currentHasPV, pvUnitValue, currentPvQtyValue]);

  const currentModulesMensal = useMemo(() => {
    const usingCombo = state.currentHasGA && state.currentHasFE;
    if (usingCombo) {
      const comboTotal = round(COMBO_PRICE_PER_USER * currentEmployeesCount);
      return round(comboTotal + currentPvMensal);
    }
    return round(currentGaMensal + currentFeMensal + currentPvMensal);
  }, [state.currentHasGA, state.currentHasFE, currentEmployeesCount, currentPvMensal, currentGaMensal, currentFeMensal]);


  // LÓGICA DE CÁLCULO (ORDEM CORRIGIDA FINAL)
  const mensalTabela = useMemo(() => findBracket(state.currentPlan, currentEmployeesCount).Valor, [state.currentPlan, currentEmployeesCount]);
  const mensalAtualEfetivo = useMemo(() => (parseNumberInput(state.mensalAtualManual) !== '' ? parseNumberInput(state.mensalAtualManual) : mensalTabela), [state.mensalAtualManual, mensalTabela]);
  
  const sameScenario = useMemo(() => state.currentPlan === state.newPlan && currentEmployeesCount === newEmployeesCount, [state.currentPlan, state.newPlan, currentEmployeesCount, newEmployeesCount]);

  const novoBaseMensal = useMemo(() => {
    if (systemPerUserValue !== null && systemPerUserValue > 0) {
      return round(systemPerUserValue * newEmployeesCount);
    }
    return findBracket(state.newPlan, newEmployeesCount).Valor;
  }, [systemPerUserValue, newEmployeesCount, state.newPlan]);

  const baseMensalParaRecorrencia = useMemo(() => {
    const hasNewModule = state.includeGA || state.includeFE || state.includePV;
    if (sameScenario && hasNewModule && state.preservarBase) {
      return mensalAtualEfetivo;
    }
    return novoBaseMensal;
  }, [sameScenario, state.includeGA, state.includeFE, state.includePV, state.preservarBase, mensalAtualEfetivo, novoBaseMensal]);
  
  const usingCombo = useMemo(() => state.includeGA && state.includeFE, [state.includeGA, state.includeFE]);
  
  const gaMensal = useMemo(() => {
    if (!state.includeGA) return 0;
    return round(gaUnitValue * newEmployeesCount);
  }, [state.includeGA, gaUnitValue, newEmployeesCount]);

  const feMensal = useMemo(() => {
    if (!state.includeFE) return 0;
    return round(feUnitValue * newEmployeesCount);
  }, [state.includeFE, feUnitValue, newEmployeesCount]);

  const pvMensal = useMemo(() => {
    if (!state.includePV) return 0;
    return round(pvUnitValue * pvQtyValue);
  }, [state.includePV, pvUnitValue, pvQtyValue]);

  const modulesMensal = useMemo(() => {
    if (usingCombo) {
      const comboTotal = round(COMBO_PRICE_PER_USER * newEmployeesCount);
      return round(comboTotal + pvMensal);
    }
    return round(gaMensal + feMensal + pvMensal);
  }, [usingCombo, newEmployeesCount, pvMensal, gaMensal, feMensal]);

  const novoMensalTotal = useMemo(() => round(baseMensalParaRecorrencia + modulesMensal), [baseMensalParaRecorrencia, modulesMensal]);
  const diffMensal = useMemo(() => round(novoMensalTotal - (mensalAtualEfetivo + currentModulesMensal)), [novoMensalTotal, mensalAtualEfetivo, currentModulesMensal]);
  
  const atualBaseAnual = useMemo(() => {
    if (state.isMigratingFromMensal) {
      return 0; // Se está migrando, o "pago" é zero, o crédito vem do proporcional mensal.
    }
    return round(parseNumberInput(state.valorAnualPago) !== '' ? parseNumberInput(state.valorAnualPago) : mensalAtualEfetivo * 12)
  }, [state.valorAnualPago, mensalAtualEfetivo, state.isMigratingFromMensal]);

  const creditoAnualBase = useMemo(() => {
    const ga = state.currentHasGA && parseNumberInput(state.currGAAnnual) !== '' ? parseNumberInput(state.currGAAnnual) : 0;
    const fe = state.currentHasFE && parseNumberInput(state.currFEAnnual) !== '' ? parseNumberInput(state.currFEAnnual) : 0;
    const pv = state.currentHasPV && parseNumberInput(state.currPVAnnual) !== '' ? parseNumberInput(state.currPVAnnual) : 0;
    return round(atualBaseAnual + ga + fe + pv);
  }, [atualBaseAnual, state.currentHasGA, state.currGAAnnual, state.currentHasFE, state.currFEAnnual, state.currentHasPV, state.currPVAnnual]);

  const creditoAnualProporcional = useMemo(() => {
    return computeProportionalCredit(state.anualInicio, state.anualFim, state.anualAlteracao, creditoAnualBase);
  }, [state.anualInicio, state.anualFim, state.anualAlteracao, creditoAnualBase]);

  const creditoMensalAuto = useMemo(() => {
    if (state.mode === 'mensal' && state.isMigratingFromAnual) {
      return creditoAnualProporcional;
    }
    return computeProportionalCredit(state.mensalInicio, state.mensalFim, state.mensalAlteracao, mensalAtualEfetivo + currentModulesMensal);
  }, [state.mode, state.isMigratingFromAnual, state.mensalInicio, state.mensalFim, state.mensalAlteracao, mensalAtualEfetivo, currentModulesMensal, creditoAnualProporcional]);

  const creditoMensal = useMemo(() => {
    // Aplica o crédito manual somente se o toggle correspondente estiver ativo
    if (state.creditMensalManualActive && manualMensalCreditValue !== null) {
      return manualMensalCreditValue;
    }
    return creditoMensalAuto;
  }, [manualMensalCreditValue, creditoMensalAuto, state.creditMensalManualActive]);
  const totalPrimeiroMes = useMemo(() => round(Math.max(0, novoMensalTotal - creditoMensal)), [novoMensalTotal, creditoMensal]);
  const baseAnual = useMemo(() => round(baseMensalParaRecorrencia * 12), [baseMensalParaRecorrencia]);
  const modAnualBruto = useMemo(() => round(modulesMensal * 12), [modulesMensal]);
  
  const baseCreditoAnual = useMemo(() => {
    const ga = state.currentHasGA && parseNumberInput(state.currGAAnnual) !== '' ? parseNumberInput(state.currGAAnnual) : 0;
    const fe = state.currentHasFE && parseNumberInput(state.currFEAnnual) !== '' ? parseNumberInput(state.currFEAnnual) : 0;
    const pv = state.currentHasPV && parseNumberInput(state.currPVAnnual) !== '' ? parseNumberInput(state.currPVAnnual) : 0;
    return round(atualBaseAnual + ga + fe + pv); 
  }, [atualBaseAnual, state.currentHasGA, state.currGAAnnual, state.currentHasFE, state.currFEAnnual, state.currentHasPV, state.currPVAnnual]);

  const creditoAnualAuto = useMemo(() => {
    if (state.isMigratingFromMensal) {
      return computeProportionalCredit(state.mensalInicio, state.mensalFim, state.mensalAlteracao, mensalAtualEfetivo + currentModulesMensal);
    }
    return computeProportionalCredit(state.anualInicio, state.anualFim, state.anualAlteracao, baseCreditoAnual)
  }, [state.isMigratingFromMensal, state.mensalInicio, state.mensalFim, state.mensalAlteracao, mensalAtualEfetivo, currentModulesMensal, state.anualInicio, state.anualFim, state.anualAlteracao, baseCreditoAnual]);
  
  const creditoAnual = useMemo(() => {
    if (!state.creditAnualManualActive) {
      return creditoAnualAuto;
    }

    const valorAplicado = parseNumberInput(state.creditAnualApplied);
    if (valorAplicado !== '') {
      return valorAplicado;
    }

    const valorDigitado = parseNumberInput(state.creditAnualManual);
    if (valorDigitado !== '') {
      return valorDigitado;
    }

    return creditoAnualAuto;
  }, [state.creditAnualManualActive, state.creditAnualApplied, state.creditAnualManual, creditoAnualAuto]);
  const diffAnual = useMemo(() => round((baseAnual + modAnualBruto) - creditoAnual), [baseAnual, modAnualBruto, creditoAnual]);
  
  const onlyModuleDiscount = useMemo(() => state.mode === 'anual' && sameScenario && (state.includeGA || state.includeFE || state.includePV) && state.preservarBase, [state.mode, sameScenario, state.includeGA, state.includeFE, state.includePV, state.preservarBase]);
  
  const calculateAnnualWithDiscount = useCallback((rate) => {
    if (state.discountOnModulesOnly) {
      return round(baseAnual + modAnualBruto * (1 - rate));
    }
    return round((baseAnual + modAnualBruto) * (1 - rate));
  }, [state.discountOnModulesOnly, baseAnual, modAnualBruto]);

  const feriasFirstPaymentBonus = useMemo(() => {
    if (state.mode === 'anual' && state.includeFE) {
      return round(feMensal * 2);
    }
    return 0;
  }, [state.mode, state.includeFE, feMensal]);

  const avistaTotal = useMemo(() => round(Math.max(0, calculateAnnualWithDiscount(ANNUAL_DISCOUNTS.avista) - creditoAnual)), [calculateAnnualWithDiscount, creditoAnual]);
  const boleto4xTotal = useMemo(() => round(Math.max(0, calculateAnnualWithDiscount(ANNUAL_DISCOUNTS.boleto4x) - creditoAnual)), [calculateAnnualWithDiscount, creditoAnual]);
  const cartao12xTotal = useMemo(() => round(Math.max(0, calculateAnnualWithDiscount(ANNUAL_DISCOUNTS.cartao12x) - creditoAnual)), [calculateAnnualWithDiscount, creditoAnual]);
  
  


  // Efeitos (Mantidos)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Estados para notificações de operações
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Função para mostrar notificação temporária
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  }, []);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('calculatorState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setState(parsedState);
        
        // Usamos um setTimeout para garantir que o estado seja atualizado antes de mostrar a notificação
        const timer = setTimeout(() => {
          showNotification('Dados da última simulação carregados', 'success');
        }, 100);
        
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify(state);
      localStorage.setItem('calculatorState', stateToSave);
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [state]);

  // Funções para aplicar / remover crédito anual manual via botão
  const applyAnnualManualCredit = useCallback(() => {
    const valorDigitado = parseNumberInput(state.creditAnualManual);

    if (valorDigitado === '') {
      showNotification('Valor manual inválido. Informe um número válido antes de aplicar.', 'error');
      return;
    }

    updateStateInstant('creditAnualApplied', String(valorDigitado));
    updateStateInstant('creditAnualManualActive', true);
    showNotification(`Crédito anual manual aplicado (${BRL.format(valorDigitado)})`, 'success');
  }, [state.creditAnualManual, showNotification]);

  const removeAnnualManualCredit = useCallback(() => {
    updateStateInstant('creditAnualApplied', '');
    updateStateInstant('creditAnualManualActive', false);
    showNotification('Aplicação de crédito manual removida', 'success');
  }, [showNotification]);

  if (!authOk) {
    return <LoginScreen onAuth={setAuthOk} />;
  }

  // Função para download PNG
  const handleDownloadSummary = useCallback(() => {
    const captureElement = document.getElementById('capture-container');
    if (captureElement && html2canvas) {
      // Adiciona uma classe temporária para melhor renderização
      document.body.classList.add('generating-png');
      showNotification('Gerando imagem da proposta...', 'info');
      
      html2canvas(captureElement, { 
        scale: 2,
        backgroundColor: theme === 'dark' ? '#0c0c0c' : '#f8fafc',
        width: captureElement.offsetWidth,
        height: captureElement.offsetHeight,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (doc) => {
          // Podemos fazer ajustes no clone do documento se necessário
          const clone = doc.getElementById('capture-container');
          if (clone) {
            clone.style.padding = '20px';
            clone.style.margin = '0';
          }
        }
      }).then(canvas => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        // Usa o nome da empresa no arquivo se estiver disponível
        const empresaNome = state.clientName ? 
          state.clientName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').substring(0, 30) : 
          'empresa';
        link.download = `proposta-${empresaNome}-${state.newPlan}-R${novoMensalTotal.toFixed(2)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.classList.remove('generating-png');
        showNotification('Proposta exportada com sucesso!', 'success');
      }).catch(err => {
        console.error("Erro ao gerar PNG:", err);
        showNotification('Erro ao gerar a imagem. Tente novamente.', 'error');
        document.body.classList.remove('generating-png');
      });
    } else {
      console.error("html2canvas not loaded or target element not found.");
      showNotification('Erro ao gerar o PNG. Verifique se a biblioteca html2canvas está instalada.', 'error');
    }
  }, [state.newPlan, novoMensalTotal, theme, showNotification, state.clientName]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-neutral-50 p-4 sm:p-6 lg:p-8">
      {/* Elementos decorativos */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-40 left-[10%] w-64 h-64 rounded-full bg-blue-200 dark:bg-blue-900/20 filter blur-3xl opacity-30"></div>
        <div className="absolute bottom-40 right-[10%] w-80 h-80 rounded-full bg-purple-200 dark:bg-purple-900/20 filter blur-3xl opacity-30"></div>
      </div>
      
      {/* Sistema de notificações */}
      {notification.show && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div 
            className={`rounded-lg shadow-lg p-4 flex items-center gap-3 transition-all duration-300 ${
              notification.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800/50' 
                : notification.type === 'error' 
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800/50'
                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : notification.type === 'error' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md backdrop-saturate-150 p-4 md:p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="grid place-content-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30 mr-4">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Calculadora AM
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ferramenta de Expansão • v2.0</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                build: {typeof __BUILD_TS__ !== 'undefined' ? new Date(__BUILD_TS__).toLocaleString('pt-BR') : 'dev'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            {/* Botão de Download PNG */}
            <Button
              onClick={handleDownloadSummary}
              variant="default" 
              size="sm"
              className="gap-2"
              title="Gerar imagem PNG do resumo"
            >
              <Download size={16} />
              <span>Exportar Proposta</span>
            </Button>
            {/* Botão de Tema */}
            <Button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              variant="outline" 
              size="sm"
              className="gap-2"
              title="Alternar tema"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
          </div>
        </header>

        <main className="space-y-8">
          {/* Container para o download PNG */}
          {/* Dados do cliente */}
          <Card className="transition-all duration-300 hover:shadow-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase size={20} className="text-blue-500" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="clientName">Nome da Empresa</Label>
                  <Input 
                    id="clientName" 
                    type="text"
                    placeholder="Ex: Empresa ABC" 
                    value={state.clientName} 
                    onChange={(e) => updateState('clientName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clientCNPJ">CNPJ</Label>
                  <Input 
                    id="clientCNPJ" 
                    type="text"
                    placeholder="Ex: 00.000.000/0001-00" 
                    value={state.clientCNPJ} 
                    onChange={(e) => updateState('clientCNPJ', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart4 size={20} className="text-blue-500" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
              <div>
                <Label>Perfil</Label>
                <div className="mt-2 flex rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-800 p-1 bg-white/50 dark:bg-neutral-900/50"> 
                  <Button onClick={() => updateStateInstant('profile', 'expansao')} size="sm" variant={state.profile === 'expansao' ? 'default' : 'ghost'} className="w-full flex items-center gap-1 justify-center">
                    <TrendingUp size={16} />
                    <span>Expansão</span>
                  </Button>
                  <Button onClick={() => updateStateInstant('profile', 'retencao')} size="sm" variant={state.profile === 'retencao' ? 'default' : 'ghost'} className="w-full flex items-center gap-1 justify-center">
                    <AlertTriangle size={16} />
                    <span>Retenção</span>
                  </Button>
                </div>
              </div>
              <div>
                <Label>Modalidade</Label>
                <div className="mt-2 flex rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-800 p-1 bg-white/50 dark:bg-neutral-900/50"> 
                  <Button onClick={() => updateStateInstant('mode', 'mensal')} size="sm" variant={state.mode === 'mensal' ? 'default' : 'ghost'} className="w-full flex items-center gap-1 justify-center">
                    <Calendar size={16} />
                    <span>Mensal</span>
                  </Button>
                  <Button onClick={() => updateStateInstant('mode', 'anual')} size="sm" variant={state.mode === 'anual' ? 'default' : 'ghost'} className="w-full flex items-center gap-1 justify-center">
                    <TrendingUp size={16} />
                    <span>Anual</span>
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="currentEmployees" className="flex items-center gap-1">
                  <Users size={14} className="text-slate-500" />
                  Colaboradores (atual)
                </Label>
                <Input id="currentEmployees" type="number" value={state.currentEmployees} onChange={(e) => updateState('currentEmployees', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="newEmployees" className="flex items-center gap-1">
                  <Users size={14} className="text-blue-500" />
                  Colaboradores (novo)
                </Label>
                <Input id="newEmployees" type="number" value={state.newEmployees} onChange={(e) => updateState('newEmployees', e.target.value)} />
              </div>
              
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 dark:border-neutral-800 rounded-xl">
                  <Label htmlFor="currentPlan">Plano atual</Label>
                  <Select id="currentPlan" value={state.currentPlan} onChange={(e) => updateStateInstant('currentPlan', e.target.value)} className="w-full mt-2">
                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div className="p-4 border border-slate-200 dark:border-neutral-800 rounded-xl">
                  <Label htmlFor="newPlan">Novo plano</Label>
                  <Select id="newPlan" value={state.newPlan} onChange={(e) => updateStateInstant('newPlan', e.target.value)} className="w-full mt-2">
                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
              </div>

              {state.mode === 'anual' && (
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <Switch id="isMigratingFromMensal" checked={state.isMigratingFromMensal} onCheckedChange={v => updateStateInstant('isMigratingFromMensal', v)} />
                    <div>
                      <Label htmlFor="isMigratingFromMensal" className="font-semibold">Migração de Mensal para Anual</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Marque se o cliente está saindo de um plano mensal para um novo plano anual.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <Switch id="discountOnModulesOnly" checked={state.discountOnModulesOnly} onCheckedChange={v => updateStateInstant('discountOnModulesOnly', v)} />
                    <div>
                      <Label htmlFor="discountOnModulesOnly" className="font-semibold">Aplicar desconto anual apenas nos módulos</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Se ativado, o desconto de plano anual incidirá somente sobre o valor dos módulos adicionados.</p>
                    </div>
                  </div>
                </div>
              )}

              {state.mode === 'mensal' && (
                <div className="md:col-span-3 mt-4">
                  <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <Switch id="isMigratingFromAnual" checked={state.isMigratingFromAnual} onCheckedChange={v => updateStateInstant('isMigratingFromAnual', v)} />
                    <div>
                      <Label htmlFor="isMigratingFromAnual" className="font-semibold">Migração de Anual para Mensal</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Marque se o cliente está saindo de um plano anual para um novo plano mensal.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8">
              <Label htmlFor="systemPerUser">Preço por funcionário (sistema) — opcional</Label>
              <Input id="systemPerUser" type="text" inputMode="decimal" placeholder="ex.: 7.50" value={state.systemPerUser} onChange={(e) => updateState('systemPerUser', e.target.value)} />
            </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                Módulos Adicionais <Badge>novo plano</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`bg-white dark:bg-neutral-900/50 border-2 ${state.includeGA ? 'border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-500/5' : 'border-slate-100 dark:border-neutral-800'} rounded-xl p-5 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{MODULES.ga.label}</h3>
                  <Switch id="includeGA" checked={state.includeGA} onCheckedChange={v => updateStateInstant('includeGA', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="gaUnit" className="text-xs flex items-center gap-1">
                      <DollarSign size={12} className="text-slate-500" />
                      Preço por func.
                    </Label>
                    <Input id="gaUnit" type="text" inputMode="decimal" value={state.gaUnit} onChange={e => updateState('gaUnit', e.target.value)} />
                  </div>
                </div>
                <div className={`p-3 rounded-lg mt-4 ${state.includeGA ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' : 'bg-slate-50 dark:bg-neutral-800'}`}>
                  <Row label="Total do módulo" value={BRL.format(gaMensal)} />
                </div>
              </div>
              
              <div className={`bg-white dark:bg-neutral-900/50 border-2 ${state.includeFE ? 'border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-500/5' : 'border-slate-100 dark:border-neutral-800'} rounded-xl p-5 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{MODULES.fe.label}</h3>
                  <Switch id="includeFE" checked={state.includeFE} onCheckedChange={v => updateStateInstant('includeFE', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="feUnit" className="text-xs flex items-center gap-1">
                      <DollarSign size={12} className="text-slate-500" />
                      Preço por func.
                    </Label>
                    <Input id="feUnit" type="text" inputMode="decimal" value={state.feUnit} onChange={e => updateState('feUnit', e.target.value)} />
                  </div>
                </div>
                <div className={`p-3 rounded-lg mt-4 ${state.includeFE ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' : 'bg-slate-50 dark:bg-neutral-800'}`}>
                  <Row label="Total do módulo" value={BRL.format(feMensal)} />
                </div>
              </div>
              
              <div className={`bg-white dark:bg-neutral-900/50 border-2 ${state.includePV ? 'border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-500/5' : 'border-slate-100 dark:border-neutral-800'} rounded-xl p-5 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{MODULES.pv.label}</h3>
                  <Switch id="includePV" checked={state.includePV} onCheckedChange={v => updateStateInstant('includePV', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="pvQty" className="text-xs flex items-center gap-1">
                      <Users size={12} className="text-slate-500" />
                      Qtd. licenças
                    </Label>
                    <Input id="pvQty" type="number" value={state.pvQty} onChange={e => updateState('pvQty', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="pvUnit" className="text-xs flex items-center gap-1">
                      <DollarSign size={12} className="text-slate-500" />
                      Preço por licença
                    </Label>
                    <Input id="pvUnit" type="text" inputMode="decimal" value={state.pvUnit} onChange={e => updateState('pvUnit', e.target.value)} />
                  </div>
                </div>
                <div className={`p-3 rounded-lg mt-4 ${state.includePV ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' : 'bg-slate-50 dark:bg-neutral-800'}`}>
                  <Row label="Total do módulo" value={BRL.format(pvMensal)} />
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card de Valor Atual - Condicional */}
            <Card>
                {state.mode === 'mensal' ? (
                    <>
                        <CardHeader><CardTitle className="text-blue-600">Valor Mensal Atual</CardTitle></CardHeader>
                        <CardContent>
                            <Label htmlFor="mensalAtualManual">Valor mensal atual (R$)</Label>
                            <Input id="mensalAtualManual" type="text" inputMode="decimal" value={state.mensalAtualManual} onChange={(e) => updateState('mensalAtualManual', e.target.value)} placeholder={BRL.format(mensalTabela)} />
                            <p className="text-xs text-slate-500 mt-2">Valor de tabela: {BRL.format(mensalTabela)}</p>
                        </CardContent>
                    </>
                ) : (
                    <>
                        <CardHeader><CardTitle className="text-blue-600">Valor Atual</CardTitle></CardHeader>
                        <CardContent>
                            <Label htmlFor="valorAnualPago">Valor anual pago (R$)</Label>
                            <Input id="valorAnualPago" type="text" inputMode="decimal" value={state.valorAnualPago} onChange={(e) => updateState('valorAnualPago', e.target.value)} placeholder={BRL.format(mensalTabela * 12)} />
                            <p className="text-xs text-slate-500 mt-2">Valor de tabela: {BRL.format(mensalTabela * 12)}</p>
                        </CardContent>
                    </>
                )}
            </Card>

            {/* Card de Crédito - Condicional */}
            <Card>
                <CardHeader><CardTitle className="text-blue-600">Crédito</CardTitle></CardHeader>
                <CardContent>
                    {state.mode === 'mensal' ? (
                        <>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <Label htmlFor="creditMensalManual">Crédito a aplicar (R$)</Label>
                                <Input id="creditMensalManual" type="text" inputMode="decimal" value={state.creditMensalManual} onChange={(e) => updateState('creditMensalManual', e.target.value)} placeholder={BRL.format(creditoMensalAuto)} />
                                <p className="text-xs text-slate-500 mt-2">
                                  {manualMensalCreditValue !== null
                                    ? <>Crédito manual informado: <span className="font-medium text-green-600 dark:text-green-400">{BRL.format(manualMensalCreditValue)}</span></>
                                    : <>Crédito automático sugerido: <span className="font-medium">{BRL.format(creditoMensalAuto)}</span></>}
                                </p>
                              </div>
                              <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                                <Switch id="creditMensalManualActive" checked={state.creditMensalManualActive} onCheckedChange={v => updateStateInstant('creditMensalManualActive', v)} />
                                <span className="text-sm">Usar crédito manual</span>
                              </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-4">
                                <Label htmlFor="creditAnualManual" className="font-medium">Crédito a aplicar (R$)</Label>
                                <div className="flex items-center gap-3">
                                  <Switch id="creditAnualManualActive" checked={state.creditAnualManualActive} onCheckedChange={v => updateStateInstant('creditAnualManualActive', v)} />
                                  <span className="text-sm">Usar crédito manual</span>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex gap-3">
                                  <Input 
                                    id="creditAnualManual" 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={state.creditAnualManual} 
                                    onChange={(e) => updateState('creditAnualManual', e.target.value)} 
                                    placeholder={BRL.format(creditoAnualAuto)}
                                    className="flex-1"
                                  />
                                  {!state.creditAnualManualActive ? (
                                    <Button variant="outline" onClick={applyAnnualManualCredit}>
                                      Aplicar crédito manual
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" onClick={removeAnnualManualCredit}>
                                      Remover aplicação
                                    </Button>
                                  )}
                                </div>
                                
                                <p className="text-xs text-slate-500 mt-2">
                                  {manualAnualCreditValue !== null
                                    ? <>Crédito manual informado: <span className="font-medium text-green-600 dark:text-green-400">{BRL.format(manualAnualCreditValue)}</span></>
                                    : <>Crédito automático sugerido: <span className="font-medium">{BRL.format(creditoAnualAuto)}</span></>}
                                </p>
                              </div>
                            </div>
                        </>
                    )}
          <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                            <Label htmlFor="dateStart" className="text-xs">Início Vigência</Label>
                            <Input id="dateStart" type="date" value={state.mode === 'mensal' ? state.mensalInicio : state.anualInicio} onChange={e => updateState(state.mode === 'mensal' ? 'mensalInicio' : 'anualInicio', e.target.value)} className="mt-1 w-full p-1 text-sm" />
                        </div>
                        <div>
                            <Label htmlFor="dateEnd" className="text-xs">Fim Vigência</Label>
                            <Input id="dateEnd" type="date" value={state.mode === 'mensal' ? state.mensalFim : state.anualFim} onChange={e => updateState(state.mode === 'mensal' ? 'mensalFim' : 'anualFim', e.target.value)} className="mt-1 w-full p-1 text-sm" />
                        </div>
                        <div>
                            <Label htmlFor="dateChange" className="text-xs">Alteração</Label>
                            <Input id="dateChange" type="date" value={state.mode === 'mensal' ? state.mensalAlteracao : state.anualAlteracao} onChange={e => updateState(state.mode === 'mensal' ? 'mensalAlteracao' : 'anualAlteracao', e.target.value)} className="mt-1 w-full p-1 text-sm" />
                        </div>
                    </div>
                    
                </CardContent>
            </Card>
          </div>

          {state.mode === 'anual' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Módulos Atuais</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <div className='flex items-center justify-between'>
                    <Label htmlFor="currentHasGA" className="font-semibold">{MODULES.ga.label}</Label>
                    <Switch id="currentHasGA" checked={state.currentHasGA} onCheckedChange={v => updateStateInstant('currentHasGA', v)} />
                  </div>
                  {state.currentHasGA && (
                    <>
                      <Label htmlFor="currGAAnnual" className='text-xs'>Valor Anual Pago (R$)</Label>
                      <Input id="currGAAnnual" type="text" inputMode="decimal" value={state.currGAAnnual} onChange={(e) => updateState('currGAAnnual', e.target.value)} />
                    </>
                  )}
                </div>
                <div className="p-4 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <div className='flex items-center justify-between'>
                    <Label htmlFor="currentHasFE" className="font-semibold">{MODULES.fe.label}</Label>
                    <Switch id="currentHasFE" checked={state.currentHasFE} onCheckedChange={v => updateStateInstant('currentHasFE', v)} />
                  </div>
                  {state.currentHasFE && (
                    <>
                      <Label htmlFor="currFEAnnual" className='text-xs'>Valor Anual Pago (R$)</Label>
                      <Input id="currFEAnnual" type="text" inputMode="decimal" value={state.currFEAnnual} onChange={(e) => updateState('currFEAnnual', e.target.value)} />
                    </>
                  )}
                </div>
                <div className="p-4 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <div className='flex items-center justify-between'>
                    <Label htmlFor="currentHasPV" className="font-semibold">{MODULES.pv.label}</Label>
                    <Switch id="currentHasPV" checked={state.currentHasPV} onCheckedChange={v => updateStateInstant('currentHasPV', v)} />
                  </div>
                  {state.currentHasPV && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="currentPvQty" className="text-xs">Qtd. licenças</Label>
                        <Input id="currentPvQty" type="number" value={state.currentPvQty} onChange={e => updateState('currentPvQty', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="currPVAnnual" className='text-xs'>Valor Anual Pago (R$)</Label>
                        <Input id="currPVAnnual" type="text" inputMode="decimal" value={state.currPVAnnual} onChange={(e) => updateState('currPVAnnual', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Container específico para captura PNG - início */}
          <div id="capture-container" className="flex flex-col space-y-6 p-8 bg-slate-50 dark:bg-neutral-950 rounded-xl w-full max-w-6xl mx-auto" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {state.clientName ? state.clientName : "Empresa"}
              </h2>
              {state.clientCNPJ && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  CNPJ: {state.clientCNPJ}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString('pt-BR')}
              </div>
              <div className="text-xs mt-1 text-slate-400 dark:text-slate-500">
                Proposta comercial
              </div>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-neutral-900/80 shadow-xl border-blue-200/50 dark:border-blue-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-6">
              <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 bg-white/80 dark:bg-neutral-900/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 shadow-sm">
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 p-2 px-4 rounded-lg">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{state.currentPlan}</span>
                  <ArrowRight className="h-5 w-5 text-blue-500" />
                  <span className="font-bold text-blue-600 dark:text-blue-400">{state.newPlan}</span>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 p-2 px-4 rounded-lg">
                  <Users size={16} className="text-slate-500" />
                  <span className="font-medium text-slate-600 dark:text-slate-400">{state.currentEmployees}</span>
                  <ArrowRight className="h-5 w-5 text-blue-500" />
                  <span className="font-bold text-blue-600 dark:text-blue-400">{state.newEmployees}</span>
                </div>
              </div>
              
              {(state.includeGA || state.includeFE || state.includePV) && (
                <div className="flex flex-wrap gap-2 bg-white/80 dark:bg-neutral-900/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mr-2">Módulos:</div>
                  {state.includeGA && <Badge className="shadow-sm">{MODULES.ga.label}</Badge>}
                  {state.includeFE && <Badge className="shadow-sm">{MODULES.fe.label}</Badge>}
                  {state.includePV && <Badge className="shadow-sm">{`${MODULES.pv.label} (${state.pvQty})`}</Badge>}
                </div>
              )}
              
              <div className="bg-white/80 dark:bg-neutral-900/50 rounded-xl border border-blue-100 dark:border-blue-900/20 overflow-hidden">
                <div className="p-4 space-y-3">
                  {state.mode === 'mensal' ? (
                    <>
                      {state.isMigratingFromAnual ? 
                        <Row label="Plano Atual (anual)" value={BRL.format(creditoAnualBase)} />
                       : 
                        <Row label="Plano Atual (mensal)" value={BRL.format(mensalAtualEfetivo + currentModulesMensal)} />
                      }
                      <Row label="Novo Plano (mensal)" value={BRL.format(novoMensalTotal)} className="font-medium" />
                    </>
                  ) : (
                    <>
                      {state.isMigratingFromMensal ? (
                        <Row label="Plano Atual (mensal)" value={BRL.format(mensalAtualEfetivo + currentModulesMensal)} />
                      ) : (
                        <Row label="Plano Atual (anual)" value={BRL.format(creditoAnualBase)} />
                      )}
                      <Row label="Novo Plano (anual)" value={BRL.format(baseAnual + modAnualBruto)} className="font-medium" />
                    </>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  {state.mode === 'mensal' ? (
                    <Row 
                      label={<span className="text-white font-medium">Diferença Mensal</span>}
                      value={
                        <span className={`text-lg font-bold ${diffMensal >= 0 ? 'text-white' : 'text-yellow-200'}`}>
                          {diffMensal >= 0 ? `+${BRL.format(diffMensal)}` : BRL.format(diffMensal)}
                        </span>
                      } 
                    />
                  ) : (
                    <Row 
                      label={<span className="text-white font-medium">Diferença Anual</span>}
                      value={
                        <span className={`text-lg font-bold ${diffAnual >= 0 ? 'text-white' : 'text-yellow-200'}`}>
                          {diffAnual >= 0 ? `+${BRL.format(diffAnual)}` : BRL.format(diffAnual)}
                        </span>
                      } 
                    />
                  )}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            {state.mode === 'mensal' ? (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={20} className="text-blue-500" />
                    Cálculo do 1º Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-blue-100 dark:border-blue-900/20 overflow-hidden">
                  <div className="p-4 space-y-3">
                    <Row label={<span className="flex items-center gap-2"><DollarSign size={16} className="text-slate-400" />Sistema</span>} value={BRL.format(baseMensalParaRecorrencia)} />
                    {gaMensal > 0 && <Row label={<span className="flex items-center gap-2"><FileText size={16} className="text-blue-500" />Gestão de Arquivos</span>} value={BRL.format(gaMensal)} />}
                    {feMensal > 0 && <Row label={<span className="flex items-center gap-2"><Calendar size={16} className="text-blue-500" />Controle de Férias</span>} value={BRL.format(feMensal)} />}
                    {pvMensal > 0 && <Row label={<span className="flex items-center gap-2"><Users size={16} className="text-blue-500" />Ponto Virtual ({state.pvQty}x)</span>} value={BRL.format(pvMensal)} />}
                    
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-neutral-700 to-transparent my-3" />
                    
                    <Row 
                      label={<span className="flex items-center gap-2 text-green-600 dark:text-green-400"><TrendingUp size={16} />{state.profile === 'retencao' || state.creditMensalManualActive ? 'Crédito Manual' : 'Crédito Proporcional'}</span>} 
                      value={<span className="text-green-600 dark:text-green-400">- {BRL.format(creditoMensal)}</span>} 
                      className="font-semibold"
                    />
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
                    <Row 
                      label={<span className="text-white font-medium text-base">Total a Pagar no 1º Mês</span>} 
                      value={<span className="text-xl font-bold text-white">{BRL.format(totalPrimeiroMes)}</span>} 
                    />
                  </div>
                </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-500" />
                    Investimento Anual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-6">
                  {state.profile === 'retencao' && (
                    <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-blue-100 dark:border-blue-900/20 p-5">
                      <h4 className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-200 mb-4">
                        Painel de Condições Personalizadas
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="customSignal">Sinal (R$)</Label>
                          <Input id="customSignal" type="text" inputMode="decimal" value={state.customSignal} onChange={(e) => updateState('customSignal', e.target.value)} placeholder="0,00" />
                        </div>
                        <div>
                          <Label htmlFor="customParcelsCount">Qtd. parcelas</Label>
                          <Input id="customParcelsCount" type="number" value={state.customParcelsCount} onChange={(e) => updateState('customParcelsCount', e.target.value)} placeholder="0" />
                        </div>
                        <div>
                          <Label htmlFor="customParcelValue">Valor por parcela (R$)</Label>
                          <Input id="customParcelValue" type="text" inputMode="decimal" value={state.customParcelValue} onChange={(e) => updateState('customParcelValue', e.target.value)} placeholder="0,00" />
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Total personalizado:</span> {BRL.format(customPaymentTotal)}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Detalhes do Plano Atual */}
                    <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-blue-100 dark:border-blue-900/20 p-5">
                      <h4 className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-neutral-800 pb-2">
                        <ChevronDown size={16} className="text-slate-400" />
                        Plano Atual ({state.isMigratingFromMensal ? 'Mensal' : 'Anual'})
                      </h4>
                      <div className="space-y-2">
                        {state.isMigratingFromMensal ? (
                          <Row label="Sistema" value={BRL.format(mensalAtualEfetivo)} />
                        ) : (
                          <Row label="Sistema" value={BRL.format(atualBaseAnual)} />
                        )}
                        {state.currentHasGA && <Row label={MODULES.ga.label} value={BRL.format(parseNumberInput(state.currGAAnnual))} />}
                        {state.currentHasFE && <Row label={MODULES.fe.label} value={BRL.format(parseNumberInput(state.currFEAnnual))} />}
                        {state.currentHasPV && <Row label={`${MODULES.pv.label} (${state.currentPvQty}x)`} value={BRL.format(parseNumberInput(state.currPVAnnual))} />}
                        
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-neutral-700 to-transparent my-3" />
                        
                        <Row 
                          label="Total Atual" 
                          value={BRL.format(state.isMigratingFromMensal ? mensalAtualEfetivo + currentModulesMensal : baseCreditoAnual)} 
                          className="font-bold text-slate-800 dark:text-slate-200" 
                        />
                      </div>
                    </div>
                    
                    {/* Detalhes do Novo Plano */}
                    <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-blue-100 dark:border-blue-900/20 p-5">
                      <h4 className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-neutral-800 pb-2">
                        <ChevronDown size={16} className="text-slate-400" />
                        Novo Plano (anual)
                      </h4>
                      <div className="space-y-2">
                        <Row label="Sistema" value={BRL.format(baseAnual)} />
                        {gaMensal > 0 && <Row label={MODULES.ga.label} value={BRL.format(gaMensal * 12)} />}
                        {feMensal > 0 && <Row label={MODULES.fe.label} value={BRL.format(feMensal * 12)} />}
                        {pvMensal > 0 && <Row label={`${MODULES.pv.label} (${state.pvQty}x)`} value={BRL.format(pvMensal * 12)} />}
                        
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-neutral-700 to-transparent my-3" />
                        
                        <Row 
                          label="Total Novo" 
                          value={BRL.format(baseAnual + modAnualBruto)} 
                          className="font-bold text-blue-600 dark:text-blue-400" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-blue-100 dark:border-blue-900/20 p-5">
                    <Row 
                      label={<span className="flex items-center gap-2 text-green-600 dark:text-green-400"><TrendingUp size={16} />{state.creditAnualManualActive ? 'Crédito Manual' : 'Crédito Proporcional'}</span>} 
                      value={<span className="text-green-600 dark:text-green-400 font-medium">- {BRL.format(creditoAnual)}</span>} 
                      className="text-base" 
                    />
                  </div>

                  <div className='grid md:grid-cols-3 gap-4'>
                    {/* Opção à vista */}
                    <div 
                      className={`rounded-xl shadow-lg transition-all duration-300 overflow-hidden ${state.selectedPayment === 'avista' ? 'ring-2 ring-blue-500 transform scale-[1.02]' : 'hover:shadow-xl'}`}
                      onClick={() => updateStateInstant('selectedPayment', 'avista')}
                    >
                        <div className={`p-4 ${state.selectedPayment === 'avista' ? 'bg-gradient-to-br from-blue-600 to-blue-500' : 'bg-white dark:bg-neutral-900'}`}>
                          <Label className={`font-semibold ${state.selectedPayment === 'avista' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            À Vista
                          </Label>
                          <div className={`text-xs font-medium mt-1 ${state.selectedPayment === 'avista' ? 'text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                            15% de desconto
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-neutral-900/50 p-5 flex flex-col items-center cursor-pointer">
                          <p className="text-2xl font-bold" style={{fontVariantNumeric:'tabular-nums'}}>{BRL.format(avistaTotal)}</p>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Pagamento único</div>
                        </div>
                    </div>
                    
                    {state.profile === 'retencao' && (
                      <div 
                        className={`rounded-xl shadow-lg transition-all duration-300 overflow-hidden ${state.selectedPayment === 'personalizado' ? 'ring-2 ring-blue-500 transform scale-[1.02]' : 'hover:shadow-xl'}`}
                        onClick={() => updateStateInstant('selectedPayment', 'personalizado')}
                      >
                        <div className={`p-4 ${state.selectedPayment === 'personalizado' ? 'bg-gradient-to-br from-blue-600 to-blue-500' : 'bg-white dark:bg-neutral-900'}`}>
                          <Label className={`font-semibold ${state.selectedPayment === 'personalizado' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            Personalizado
                          </Label>
                          <div className={`text-xs font-medium mt-1 ${state.selectedPayment === 'personalizado' ? 'text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                            Definido na seção acima
                          </div>
                        </div>
                        <div className="bg-white dark:bg-neutral-900/50 p-5 flex flex-col items-center cursor-pointer">
                          <p className="text-2xl font-bold" style={{fontVariantNumeric:'tabular-nums'}}>{BRL.format(customPaymentTotal)}</p>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {customParcelsCountValue > 0 ? (
                              <>
                                {BRL.format(customSignalValue)} de sinal + {customParcelsCountValue}x de {BRL.format(customParcelValue)}
                              </>
                            ) : (
                              <>Ajuste os campos acima</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Opção 4x */}
                    <div 
                      className={`rounded-xl shadow-lg transition-all duration-300 overflow-hidden ${state.selectedPayment === 'boleto4x' ? 'ring-2 ring-blue-500 transform scale-[1.02]' : 'hover:shadow-xl'}`}
                      onClick={() => updateStateInstant('selectedPayment', 'boleto4x')}
                    >
                        <div className={`p-4 ${state.selectedPayment === 'boleto4x' ? 'bg-gradient-to-br from-blue-600 to-blue-500' : 'bg-white dark:bg-neutral-900'}`}>
                          <Label className={`font-semibold ${state.selectedPayment === 'boleto4x' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            Boleto 4x
                          </Label>
                          <div className={`text-xs font-medium mt-1 ${state.selectedPayment === 'boleto4x' ? 'text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                            12% de desconto
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-neutral-900/50 p-5 flex flex-col items-center cursor-pointer">
                          <p className="text-2xl font-bold" style={{fontVariantNumeric:'tabular-nums'}}>{BRL.format(boleto4xTotal)}</p>
                          
                          {feriasFirstPaymentBonus > 0 ? (
                            <div className="flex flex-col items-center mt-2">
                              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                1x {BRL.format(boleto4xTotal / 4 - feriasFirstPaymentBonus)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                + 3x {BRL.format(boleto4xTotal / 4)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              4x de {BRL.format(boleto4xTotal / 4)}
                            </div>
                          )}
                        </div>
                    </div>
                    
                    {/* Opção 12x */}
                    <div 
                      className={`rounded-xl shadow-lg transition-all duration-300 overflow-hidden ${state.selectedPayment === 'cartao12x' ? 'ring-2 ring-blue-500 transform scale-[1.02]' : 'hover:shadow-xl'}`}
                      onClick={() => updateStateInstant('selectedPayment', 'cartao12x')}
                    >
                        <div className={`p-4 ${state.selectedPayment === 'cartao12x' ? 'bg-gradient-to-br from-blue-600 to-blue-500' : 'bg-white dark:bg-neutral-900'}`}>
                          <Label className={`font-semibold ${state.selectedPayment === 'cartao12x' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            Cartão 12x
                          </Label>
                          <div className={`text-xs font-medium mt-1 ${state.selectedPayment === 'cartao12x' ? 'text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                            7% de desconto
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-neutral-900/50 p-5 flex flex-col items-center cursor-pointer">
                          <p className="text-2xl font-bold" style={{fontVariantNumeric:'tabular-nums'}}>{BRL.format(cartao12xTotal)}</p>
                          
                          {feriasFirstPaymentBonus > 0 ? (
                            <div className="flex flex-col items-center mt-2">
                              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                1x {BRL.format(cartao12xTotal / 12 - feriasFirstPaymentBonus)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                + 11x {BRL.format(cartao12xTotal / 12)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              12x de {BRL.format(cartao12xTotal / 12)}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>

                  {feriasFirstPaymentBonus > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-lg p-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <TrendingUp size={16} />
                      <span>Bônus de Férias (-{BRL.format(feriasFirstPaymentBonus)}) já aplicado na 1ª parcela.</span>
                    </div>
                  )}
                </div>
                </CardContent>
              </>
            )}
          </Card>
          </div> {/* Fechamento do capture-container */}
        </main>
      </div>
    </div>
  );
}