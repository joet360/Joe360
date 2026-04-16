import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles, CreditCard, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { auth } from '../lib/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const SettingsView = () => {
  const { user, plan, subscriptionStatus } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
        }),
      });

      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error('Invalid response from server');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header className="p-4 lg:p-6 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto w-full">
          <h1 className="text-2xl font-light tracking-tight text-foreground">Settings</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Manage your account & subscription</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Profile Section */}
          <section className="space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Profile</h2>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-light text-primary">{user?.displayName?.[0] || user?.email?.[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user?.displayName || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                    {plan === 'pro' ? 'Pro Member' : 'Free Plan'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Subscription Section */}
          <section className="space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Subscription</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Plan */}
              <Card className={cn(
                "border-border/50 bg-card/50 transition-all",
                plan === 'free' && "ring-1 ring-primary border-primary/20"
              )}>
                <CardHeader>
                  <CardTitle className="text-xl font-light">Basic</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Free Forever</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-light">$0<span className="text-sm text-muted-foreground">/mo</span></div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-primary" />
                      Basic Task Management
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-primary" />
                      Expense Tracking
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-primary" />
                      Standard AI Chat
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full rounded-lg" disabled={plan === 'free'}>
                    {plan === 'free' ? 'Current Plan' : 'Downgrade'}
                  </Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className={cn(
                "border-border/50 bg-card relative overflow-hidden transition-all shadow-lg",
                plan === 'pro' && "ring-1 ring-primary border-primary/20"
              )}>
                {plan !== 'pro' && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest px-3 py-1 rotate-45 translate-x-4 translate-y-2">
                    Best Value
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl font-light flex items-center gap-2">
                    Pro
                    <Sparkles size={18} className="text-primary" />
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Advanced Features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-light">$5<span className="text-sm text-muted-foreground">/mo</span></div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-primary" />
                      Advanced AI Assistant
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-primary" />
                      Unlimited Tasks & Expenses
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-primary" />
                      Priority Support
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-primary" />
                      Custom Categories
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleUpgrade} 
                    className="w-full rounded-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    disabled={loading || plan === 'pro'}
                  >
                    {loading ? 'Processing...' : plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          {/* Account Actions */}
          <section className="space-y-4 pb-24">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Account</h2>
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 rounded-lg h-12"
                onClick={handleLogout}
              >
                <LogOut size={18} className="mr-3" />
                Sign Out
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
