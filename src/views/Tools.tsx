import React, { useState, useEffect } from 'react';
import { Calculator, RefreshCw, ArrowRightLeft, History, Delete, Divide, Minus, Plus, X, Percent, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrencySymbol, convertCurrency, CURRENCIES } from '../lib/currencies';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';

export const ToolsView = () => {
  const { currency: userCurrency } = useAuth();
  
  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcEquation, setCalcEquation] = useState('');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);

  // Currency Converter State
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState(userCurrency || 'EUR');
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState<number>(0);

  useEffect(() => {
    const result = convertCurrency(parseFloat(amount) || 0, fromCurrency, toCurrency);
    setConvertedAmount(result);
  }, [amount, fromCurrency, toCurrency]);

  // Calculator Logic
  const handleCalcInput = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcEquation('');
      return;
    }
    if (val === '=') {
      try {
        // Basic eval replacement for safety
        const sanitized = calcEquation.replace(/x/g, '*').replace(/÷/g, '/');
        const result = Function(`'use strict'; return (${sanitized})`)();
        const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, '');
        setCalcHistory(prev => [calcEquation + ' = ' + formattedResult, ...prev].slice(0, 10));
        setCalcDisplay(formattedResult);
        setCalcEquation(formattedResult);
      } catch (e) {
        setCalcDisplay('Error');
      }
      return;
    }
    if (val === 'DEL') {
      setCalcEquation(prev => prev.slice(0, -1));
      setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }

    setCalcEquation(prev => prev + val);
    setCalcDisplay(prev => (prev === '0' || ['+', '-', 'x', '÷'].includes(prev)) ? val : prev + val);
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header className="p-4 lg:p-6 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto w-full">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-light tracking-tight text-foreground">Tools</h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Utility & Conversion
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-6">
          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/50 p-1">
              <TabsTrigger value="calculator" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Calculator size={14} className="mr-2" />
                Calculator
              </TabsTrigger>
              <TabsTrigger value="converter" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <RefreshCw size={14} className="mr-2" />
                Converter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="mt-6 space-y-4">
              <Card className="border-border/50 bg-card shadow-sm overflow-hidden rounded-lg">
                <div className="p-6 bg-muted/20 text-right space-y-1">
                  <div className="text-[10px] font-mono text-muted-foreground h-4 overflow-hidden uppercase tracking-widest">
                    {calcEquation || ' '}
                  </div>
                  <div className="text-4xl font-mono font-medium tracking-tighter truncate">
                    {calcDisplay}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-4 gap-2">
                  {['C', 'DEL', '%', '÷'].map(btn => (
                    <Button 
                      key={btn} 
                      variant="secondary" 
                      className="h-14 text-lg font-bold rounded-md bg-muted/50 hover:bg-muted"
                      onClick={() => handleCalcInput(btn)}
                    >
                      {btn === 'DEL' ? <Delete size={20} /> : btn}
                    </Button>
                  ))}
                  {['7', '8', '9', 'x'].map(btn => (
                    <Button 
                      key={btn} 
                      variant={['x'].includes(btn) ? 'default' : 'ghost'} 
                      className={cn("h-14 text-xl font-medium rounded-md", ['x'].includes(btn) ? "bg-primary text-primary-foreground" : "hover:bg-muted/50")}
                      onClick={() => handleCalcInput(btn)}
                    >
                      {btn}
                    </Button>
                  ))}
                  {['4', '5', '6', '-'].map(btn => (
                    <Button 
                      key={btn} 
                      variant={['-'].includes(btn) ? 'default' : 'ghost'} 
                      className={cn("h-14 text-xl font-medium rounded-md", ['-'].includes(btn) ? "bg-primary text-primary-foreground" : "hover:bg-muted/50")}
                      onClick={() => handleCalcInput(btn)}
                    >
                      {btn}
                    </Button>
                  ))}
                  {['1', '2', '3', '+'].map(btn => (
                    <Button 
                      key={btn} 
                      variant={['+'].includes(btn) ? 'default' : 'ghost'} 
                      className={cn("h-14 text-xl font-medium rounded-md", ['+'].includes(btn) ? "bg-primary text-primary-foreground" : "hover:bg-muted/50")}
                      onClick={() => handleCalcInput(btn)}
                    >
                      {btn}
                    </Button>
                  ))}
                  <Button variant="ghost" className="h-14 text-xl font-medium rounded-md hover:bg-muted/50" onClick={() => handleCalcInput('0')}>0</Button>
                  <Button variant="ghost" className="h-14 text-xl font-medium rounded-md hover:bg-muted/50" onClick={() => handleCalcInput('.')}>.</Button>
                  <Button variant="default" className="h-14 col-span-2 text-xl font-bold rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20" onClick={() => handleCalcInput('=')}>
                    <Equal size={24} />
                  </Button>
                </div>
              </Card>

              {calcHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    <History size={10} /> History
                  </div>
                  <div className="space-y-1">
                    {calcHistory.map((item, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded-md text-[11px] font-mono text-muted-foreground text-right">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="converter" className="mt-6 space-y-4">
              <Card className="border-border/50 bg-card shadow-sm p-6 rounded-lg space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Amount</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold">
                        {getCurrencySymbol(fromCurrency)}
                      </div>
                      <Input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-14 rounded-md bg-muted/50 border-none pl-10 focus-visible:ring-primary/20 font-mono text-lg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">From</label>
                      <select 
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        className="w-full h-12 rounded-md bg-muted/50 border-none px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.code} value={curr.code}>{curr.code} - {curr.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={swapCurrencies}
                      className="mt-6 w-10 h-10 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <ArrowRightLeft size={16} />
                    </Button>

                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">To</label>
                      <select 
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        className="w-full h-12 rounded-md bg-muted/50 border-none px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.code} value={curr.code}>{curr.code} - {curr.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Result</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-xl font-light text-muted-foreground">{getCurrencySymbol(toCurrency)}</span>
                      <span className="text-4xl font-mono font-medium tracking-tighter">
                        {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider mt-2">
                      1 {fromCurrency} = {(convertCurrency(1, fromCurrency, toCurrency)).toFixed(4)} {toCurrency}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <RefreshCw size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Live Rates</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-1">
                      Currency rates are updated daily based on global market data.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};
