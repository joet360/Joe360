import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt, Plus, Trash2, Calendar as CalendarIcon, Tag, Filter, X } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getCurrencySymbol, convertCurrency } from '../lib/currencies';

export const ExpensesView = () => {
  const { user, currency } = useAuth();
  const { data: expenses } = useFirestore<any>('expenses');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
  
  // Filtering state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const symbol = getCurrencySymbol(currency);

  const categories = Array.from(new Set(expenses.map((e: any) => e.category))).sort();

  const filteredExpenses = expenses.filter((expense: any) => {
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const expenseDate = new Date(expense.date);
      const start = dateRange.start ? startOfDay(new Date(dateRange.start)) : new Date(0);
      const end = dateRange.end ? endOfDay(new Date(dateRange.end)) : new Date(8640000000000000);
      matchesDate = isWithinInterval(expenseDate, { start, end });
    }
    
    return matchesCategory && matchesDate;
  });

  const addExpense = async () => {
    if (!newExpense.amount || !newExpense.category || !user) return;
    try {
      // Convert the entered amount to USD for storage
      const amountInUSD = convertCurrency(parseFloat(newExpense.amount), currency, 'USD');
      
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: amountInUSD,
        category: newExpense.category,
        description: newExpense.description,
        date: new Date(newExpense.date).toISOString(),
        createdAt: new Date().toISOString()
      });
      setNewExpense({ amount: '', category: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
      setIsAddOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'expenses');
    }
  };

  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalUSD = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const convertedTotal = convertCurrency(totalUSD, 'USD', currency);

  const clearFilters = () => {
    setFilterCategory('all');
    setDateRange({ start: '', end: '' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header className="p-4 lg:p-6 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-light tracking-tight text-foreground">Expenses</h1>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                {filteredExpenses.length} transactions shown
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "w-10 h-10 rounded-lg transition-all", 
                  isFilterVisible ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/50 hover:bg-muted"
                )}
                onClick={() => setIsFilterVisible(!isFilterVisible)}
              >
                {isFilterVisible ? <X size={18} /> : <Filter size={18} />}
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger render={
                  <Button size="icon" className="w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" />
                }>
                  <Plus size={20} />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-lg p-8 border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold tracking-tight">Log Expense</DialogTitle>
                    <DialogDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Keep track of your spending</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Amount</Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold">{symbol}</div>
                        <Input 
                          id="amount" 
                          type="number"
                          placeholder="0.00" 
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          className="h-14 rounded-md bg-muted/50 border-none pl-10 focus-visible:ring-primary/20 font-mono text-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                      <Input 
                        id="category" 
                        placeholder="e.g. Food, Rent, Transport" 
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                        className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Description (Optional)</Label>
                      <Input 
                        id="description" 
                        placeholder="What was this for?" 
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Date</Label>
                      <Input 
                        id="date" 
                        type="datetime-local" 
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                      />
                    </div>
                    <Button onClick={addExpense} className="w-full h-14 rounded-lg bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Log Expense</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <AnimatePresence>
            {isFilterVisible && (
              <motion.div 
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground ml-1">Filter by Category</Label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-10 rounded-md bg-background border-none shadow-sm font-medium text-xs">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-border/50">
                          <SelectItem value="all" className="rounded-md text-xs">All Categories</SelectItem>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat} value={cat} className="rounded-md text-xs">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground ml-1">Filter by Date Range</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="date" 
                          className="h-10 rounded-md bg-background border-none shadow-sm px-3 font-medium text-xs" 
                          value={dateRange.start}
                          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                        <span className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest opacity-40">to</span>
                        <Input 
                          type="date" 
                          className="h-10 rounded-md bg-background border-none shadow-sm px-3 font-medium text-xs" 
                          value={dateRange.end}
                          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  {(filterCategory !== 'all' || dateRange.start || dateRange.end) && (
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        <X size={12} className="mr-1.5" /> Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div
            layout
            className="bg-primary text-primary-foreground rounded-lg p-6 lg:p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
              <Receipt size={100} />
            </div>
            <div className="relative z-10">
              <p className="text-[9px] font-bold opacity-70 uppercase tracking-[0.2em] mb-1">
                {filterCategory !== 'all' || dateRange.start || dateRange.end ? 'Filtered Total' : 'Total Spending'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-light opacity-50">{symbol}</span>
                <span className="text-4xl font-mono font-medium tracking-tighter">
                  {convertedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <ScrollArea className="flex-1 pb-20">
        <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-2">
          <AnimatePresence mode="popLayout">
            {sortedExpenses.map((expense) => (
              <motion.div
                key={expense.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-muted/50 rounded-md flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                    <Tag size={16} className="text-muted-foreground group-hover:text-primary/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{expense.description || expense.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.15em] bg-muted/50 px-1.5 py-0.5 rounded-md">
                        {expense.category}
                      </span>
                      <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-4">
                  <div className="text-base font-mono font-bold text-foreground">
                    -{symbol}{convertCurrency(expense.amount, 'USD', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button 
                    onClick={() => deleteExpense(expense.id)}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground/20 hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {expenses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-muted/10 rounded-lg border border-dashed border-border/50">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Receipt size={24} className="text-muted-foreground/20" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">No transactions yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
