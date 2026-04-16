import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, Receipt, Calendar, ArrowUpRight, TrendingUp, LogOut, Moon, Sun, Bell, BellOff, Sparkles, PieChart as PieChartIcon } from 'lucide-react';
import { format, startOfMonth, subMonths, isAfter, isSameMonth } from 'date-fns';
import { motion } from 'motion/react';
import { logout } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import { CURRENCIES, getCurrencySymbol, convertCurrency } from '../lib/currencies';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DashboardView = () => {
  const { user, currency, updateCurrency, plan } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: tasks } = useFirestore<any>('tasks');
  const { data: expenses } = useFirestore<any>('expenses');
  const { permission, requestPermission } = useNotifications(tasks);

  const handleCurrencyChange = async (newCurrency: string) => {
    await updateCurrency(newCurrency);
  };

  const todayTasks = tasks.filter(t => !t.completed).slice(0, 3);
  const totalExpensesUSD = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const convertedTotal = convertCurrency(totalExpensesUSD, 'USD', currency);
  const recentExpenses = expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  const symbol = getCurrencySymbol(currency);

  // Prepare chart data: Last 6 months spending
  const chartData = React.useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, 'MMM'),
        fullDate: startOfMonth(date),
        total: 0,
        categories: {} as Record<string, number>
      };
    }).reverse();

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const monthIndex = months.findIndex(m => 
        m.fullDate.getMonth() === expenseDate.getMonth() && 
        m.fullDate.getFullYear() === expenseDate.getFullYear()
      );

      if (monthIndex !== -1) {
        const amountInCurrentCurrency = convertCurrency(expense.amount, 'USD', currency);
        months[monthIndex].total += amountInCurrentCurrency;
        
        const cat = expense.category || 'Other';
        months[monthIndex].categories[cat] = (months[monthIndex].categories[cat] || 0) + amountInCurrentCurrency;
      }
    });

    return months;
  }, [expenses, currency]);

  const categoryData = React.useMemo(() => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const categoryMap: Record<string, number> = {};

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (isAfter(expenseDate, startOfCurrentMonth) || isSameMonth(expenseDate, startOfCurrentMonth)) {
        const amountInCurrentCurrency = convertCurrency(expense.amount, 'USD', currency);
        const cat = expense.category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + amountInCurrentCurrency;
      }
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories
  }, [expenses, currency]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold mb-2">{label}</p>
          <p className="text-primary mb-1">Total: {symbol}{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <div className="space-y-1 mt-2 pt-2 border-t border-border">
            {Object.entries(chartData.find(d => d.month === label)?.categories || {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([cat, val]) => (
                <div key={cat} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium">{symbol}{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ScrollArea className="flex-1 pb-20 bg-background">
      <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              {format(new Date(), 'EEEE, MMMM do')}
            </p>
            <h1 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-3">
              Hello, <span className="font-semibold">{user?.displayName?.split(' ')[0]}</span>
              {plan === 'pro' && (
                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={8} />
                  Pro
                </Badge>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-lg border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 px-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-md hover:bg-background shadow-none"
                onClick={requestPermission}
                title={permission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
              >
                {permission === 'granted' ? <Bell size={14} className="text-primary" /> : <BellOff size={14} className="text-muted-foreground" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-md hover:bg-background shadow-none"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </Button>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[70px] h-8 text-[10px] font-bold border-none shadow-none rounded-md bg-transparent hover:bg-background">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-lg">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs rounded-md">
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-[1px] bg-border/50 mx-1" />
            <div className="flex items-center gap-3 pl-1 pr-2">
              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border/50 ring-2 ring-background">
                <img src={user?.photoURL || ''} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-[10px] uppercase tracking-widest text-muted-foreground h-8 px-2 hover:text-destructive hover:bg-destructive/5">
                <LogOut size={12} />
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative h-full min-h-[140px] flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
                <TrendingUp size={120} />
              </div>
              <CardHeader className="pb-1 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Monthly Spending</p>
              </CardHeader>
              <CardContent className="relative z-10 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-light opacity-50">{symbol}</span>
                  <span className="text-4xl font-mono font-medium tracking-tighter">
                    {convertedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <ArrowUpRight size={10} className="mr-1" /> +12.5%
                  </Badge>
                  <span className="text-[10px] opacity-50 font-medium uppercase tracking-wider">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card border-border/50 shadow-sm h-full flex flex-col justify-center p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-lg border-dashed hover:border-primary hover:bg-primary/5 transition-all group">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary">
                    <Receipt size={12} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Expense</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-lg border-dashed hover:border-primary hover:bg-primary/5 transition-all group">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary">
                    <Calendar size={12} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Task</span>
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Spending Trends */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Spending Trends</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Last 6 Months
            </div>
          </div>
          <Card className="p-4 bg-card border-border/50 shadow-sm overflow-hidden rounded-lg">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" className="text-muted/10" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: 'currentColor' }} 
                    className="text-muted-foreground"
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: 'currentColor' }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => `${symbol}${value}`}
                  />
                  <Tooltip 
                    content={<CustomTooltip />} 
                    cursor={{ fill: 'currentColor', opacity: 0.03 }} 
                  />
                  <Bar 
                    dataKey="total" 
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="currentColor"
                        className="text-primary"
                        opacity={0.2 + (index / chartData.length) * 0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Category Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Category Breakdown</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-primary" />
              This Month
            </div>
          </div>
          <Card className="p-4 bg-card border-border/50 shadow-sm overflow-hidden rounded-lg">
            {categoryData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryData} 
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="currentColor" className="text-muted/10" />
                    <XAxis 
                      type="number"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: 'currentColor' }}
                      className="text-muted-foreground"
                      tickFormatter={(value) => `${symbol}${value}`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: 'currentColor' }}
                      className="text-muted-foreground"
                      width={80}
                    />
                    <Tooltip 
                      cursor={{ fill: 'currentColor', opacity: 0.03 }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: number) => [`${symbol}${value.toFixed(2)}`, 'Spent']}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="currentColor"
                      className="text-primary"
                      radius={[0, 6, 6, 0]} 
                      barSize={20}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill="currentColor"
                          className="text-primary"
                          opacity={1 - (index / categoryData.length) * 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
                  <PieChartIcon size={20} className="text-muted-foreground/30" />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">No expenses this month</p>
              </div>
            )}
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Tasks */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Today's Tasks</h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold px-3 py-1 rounded-full">
                {todayTasks.length} Pending
              </Badge>
            </div>
            <div className="space-y-2">
              {todayTasks.length > 0 ? todayTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                    <Circle className="text-muted-foreground/30 group-hover:text-primary/40" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{task.title}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{task.category || 'General'}</p>
                  </div>
                  {task.dueDate && (
                    <div className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md flex items-center gap-1">
                      <Calendar size={10} className="opacity-50" />
                      {format(new Date(task.dueDate), 'HH:mm')}
                    </div>
                  )}
                </motion.div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 bg-muted/20 rounded-lg border border-dashed border-border">
                  <CheckCircle2 size={24} className="text-muted-foreground/20 mb-2" />
                  <p className="text-[10px] text-muted-foreground font-medium">No tasks for today</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Expenses */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Recent Activity</h2>
            <div className="space-y-2">
              {recentExpenses.map((expense, i) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-muted/50 rounded-md flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      <Receipt size={16} className="text-muted-foreground group-hover:text-primary/60" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{expense.description || expense.category}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-sm font-mono font-bold text-foreground pl-4">
                    -{symbol}{convertCurrency(expense.amount, 'USD', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ScrollArea>
  );
};
