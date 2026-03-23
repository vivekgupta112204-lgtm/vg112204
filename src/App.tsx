import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek, endOfWeek, parseISO, differenceInDays } from 'date-fns';
import { cn } from './lib/utils';
import { Category, Mistake, DayEntry, AppState } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORIES: Category[] = ['Productivity', 'Health', 'Social', 'Money', 'Other'];
const CATEGORY_COLORS: Record<Category, string> = {
  Productivity: '#4958ac',
  Health: '#ac3149',
  Social: '#a04223',
  Money: '#4b626e',
  Other: '#777b7f',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'summary' | 'history' | 'premium'>('home');
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [streak, setStreak] = useState(0);
  const [lastLoggedDate, setLastLoggedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMistakeText, setNewMistakeText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Productivity');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const saved = localStorage.getItem('reflectly_data');
    if (saved) {
      const parsed = JSON.parse(saved) as AppState;
      setEntries(parsed.entries || {});
      setStreak(parsed.streak || 0);
      setLastLoggedDate(parsed.lastLoggedDate || null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('reflectly_data', JSON.stringify({ entries, streak, lastLoggedDate }));
  }, [entries, streak, lastLoggedDate]);

  const addMistake = () => {
    if (!newMistakeText.trim()) return;

    const newMistake: Mistake = {
      id: Math.random().toString(36).substr(2, 9),
      text: newMistakeText,
      category: selectedCategory,
      timestamp: Date.now(),
    };

    const currentEntries = { ...entries };
    if (!currentEntries[today]) {
      currentEntries[today] = { date: today, mistakes: [] };
    }
    currentEntries[today].mistakes.push(newMistake);

    let newStreak = streak;
    if (lastLoggedDate !== today) {
      if (lastLoggedDate) {
        const diff = differenceInDays(parseISO(today), parseISO(lastLoggedDate));
        if (diff === 1) {
          newStreak += 1;
        } else if (diff > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      setLastLoggedDate(today);
      setStreak(newStreak);
    }

    setEntries(currentEntries);
    setNewMistakeText('');
    setShowAddModal(false);
  };

  const deleteMistake = (date: string, id: string) => {
    const currentEntries = { ...entries };
    if (currentEntries[date]) {
      currentEntries[date].mistakes = currentEntries[date].mistakes.filter(m => m.id !== id);
      setEntries(currentEntries);
    }
  };

  const getWeeklyStats = () => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    let total = 0;
    const categoryCounts: Record<Category, number> = {
      Productivity: 0, Health: 0, Social: 0, Money: 0, Other: 0,
    };
    const mistakeFrequencies: Record<string, number> = {};

    (Object.values(entries) as DayEntry[]).forEach(entry => {
      const entryDate = parseISO(entry.date);
      if (entryDate >= start && entryDate <= end) {
        entry.mistakes.forEach(m => {
          total++;
          categoryCounts[m.category]++;
          const lowerText = m.text.toLowerCase().trim();
          mistakeFrequencies[lowerText] = (mistakeFrequencies[lowerText] || 0) + 1;
        });
      }
    });

    const topMistake = Object.entries(mistakeFrequencies).sort((a, b) => b[1] - a[1])[0];
    const chartData = CATEGORIES.map(cat => ({
      name: cat,
      count: categoryCounts[cat],
      fill: CATEGORY_COLORS[cat]
    }));

    return { total, topMistake, chartData };
  };

  const renderHome = () => {
    const todayMistakes = entries[today]?.mistakes || [];
    return (
      <div className="space-y-12">
        <section className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-label text-sm text-on-surface-variant tracking-widest uppercase mb-2 block">
                {format(new Date(), 'EEEE, MMMM do')}
              </span>
              <h2 className="font-headline text-display-lg font-light tracking-tight text-on-surface">Daily Log</h2>
            </div>
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-tertiary-container/20 rounded-full border border-tertiary-container/30">
              <span className="text-tertiary text-lg">🔥</span>
              <span className="font-label text-sm font-bold text-tertiary tracking-wide uppercase">{streak} Day Reflection Streak</span>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h3 className="font-headline text-headline-md text-secondary mb-8 leading-relaxed">What mistakes did you make today?</h3>
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {todayMistakes.map((mistake, index) => (
                <motion.div
                  key={mistake.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[mistake.category] }}></div>
                  <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(47,51,54,0.04)] ml-4 transition-all duration-300 hover:shadow-[0_25px_50px_rgba(47,51,54,0.06)] flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-on-surface text-lg leading-relaxed">{mistake.text}</p>
                      <div className="mt-4 flex items-center gap-4">
                        <span className="text-xs font-label text-on-surface-variant/60 uppercase tracking-widest">Entry #{index + 1} • {mistake.category}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteMistake(today, mistake.id)}
                      className="text-on-surface-variant/40 hover:text-error transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={() => setShowAddModal(true)}
              className="group w-full flex items-center justify-center gap-3 py-6 rounded-xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all duration-300"
            >
              <span className="material-symbols-outlined">add</span>
              <span className="font-label font-medium tracking-wide">+ Add mistake</span>
            </button>
          </div>
        </section>

        <section className="flex flex-col items-center gap-6 mt-16">
          <p className="text-on-surface-variant/60 text-sm font-body italic">Growth begins at the end of your comfort zone.</p>
        </section>

        <section className="mt-24 mb-8">
          <div className="bg-surface-container-low rounded-xl p-8 flex flex-col md:flex-row items-center gap-6 border border-outline-variant/10">
            <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl">auto_awesome</span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-headline text-lg font-bold text-on-surface">Deep Reflection AI</h4>
              <p className="text-on-surface-variant text-sm mt-1">Get personalized patterns from your daily logs. Try Premium for 7 days.</p>
            </div>
            <button 
              onClick={() => setActiveTab('premium')}
              className="px-6 py-2 border border-primary text-primary rounded-full text-sm font-bold hover:bg-primary hover:text-on-primary transition-all"
            >
              Upgrade
            </button>
          </div>
        </section>
      </div>
    );
  };

  const renderSummary = () => {
    const { total, topMistake, chartData } = getWeeklyStats();
    return (
      <div className="space-y-12">
        <header className="mb-16">
          <span className="font-label text-sm text-on-surface-variant tracking-widest uppercase mb-2 block">Analysis</span>
          <h2 className="font-headline text-display-lg font-light tracking-tight text-on-surface">Your Patterns</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-headline font-bold text-primary mb-2">{total}</span>
            <span className="text-on-surface-variant text-sm uppercase tracking-widest font-label">Total Mistakes</span>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-headline font-bold text-tertiary mb-2 capitalize">
              {topMistake ? topMistake[0] : 'N/A'}
            </span>
            <span className="text-on-surface-variant text-sm uppercase tracking-widest font-label">Most Repeated</span>
            {topMistake && (
              <span className="text-xs text-tertiary font-bold mt-2 bg-tertiary/10 px-3 py-1 rounded-full">
                {topMistake[1]} TIMES
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/10 space-y-8">
          <h3 className="font-headline text-xl text-on-surface">Category Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eceef1" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  width={100}
                  tick={{ fill: '#5c5f63', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {topMistake && topMistake[1] > 2 && (
          <div className="bg-tertiary-container/10 border border-tertiary-container/20 p-8 rounded-2xl flex items-start gap-6">
            <div className="p-3 bg-tertiary text-on-tertiary rounded-xl">
              <span className="material-symbols-outlined">insights</span>
            </div>
            <div>
              <h4 className="font-headline text-lg font-bold text-tertiary">Pattern Detected</h4>
              <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
                You are repeating "{topMistake[0]}" frequently. Awareness is the first step to breaking this pattern.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const sortedDates = Object.keys(entries).sort((a, b) => b.localeCompare(a));
    return (
      <div className="space-y-12">
        <header className="mb-16">
          <span className="font-label text-sm text-on-surface-variant tracking-widest uppercase mb-2 block">History</span>
          <h2 className="font-headline text-display-lg font-light tracking-tight text-on-surface">Past Reflections</h2>
        </header>

        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date} className="relative pl-8 border-l-2 border-surface-container-highest">
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background"></div>
              <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline text-xl font-bold text-on-surface">{format(parseISO(date), 'EEEE, MMM do')}</h3>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">
                    {entries[date].mistakes.length} ENTRIES
                  </span>
                </div>
                <div className="space-y-4">
                  {entries[date].mistakes.map(m => (
                    <div key={m.id} className="flex items-start gap-4 p-4 bg-surface-container-low rounded-xl">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[m.category] }} />
                      <p className="text-on-surface-variant text-sm leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {sortedDates.length === 0 && (
            <div className="text-center py-32 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-6xl mb-4">history_edu</span>
              <p className="font-label uppercase tracking-widest text-sm">No history yet. Start logging today!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPremium = () => {
    return (
      <div className="space-y-12">
        <header className="mb-16">
          <span className="font-label text-sm text-on-surface-variant tracking-widest uppercase mb-2 block">Premium</span>
          <h2 className="font-headline text-display-lg font-light tracking-tight text-on-surface">Go Deeper</h2>
        </header>

        <div className="bg-inverse-surface p-12 rounded-[2.5rem] text-on-primary space-y-12 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4">
              <h3 className="text-3xl font-headline font-bold">Reflectly Pro</h3>
              <p className="text-inverse-on-surface text-lg">Master your behavior patterns with AI-driven insights.</p>
            </div>
            <span className="material-symbols-outlined text-tertiary-container text-5xl">workspace_premium</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {[
              { title: 'Advanced Insights', desc: 'Deep dive into behavioral psychology.', icon: 'psychology' },
              { title: 'Unlimited Categories', desc: 'Create custom tags for your mistakes.', icon: 'label' },
              { title: 'Dark Themes', desc: 'Exclusive minimalist dark modes.', icon: 'dark_mode' },
              { title: 'Export Data', desc: 'Download your history in PDF or CSV.', icon: 'download' },
              { title: 'No Ads', desc: 'A completely clean reflection experience.', icon: 'block' },
              { title: 'Cloud Sync', desc: 'Access your logs on any device.', icon: 'cloud_sync' },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4">
                <span className="material-symbols-outlined text-primary-fixed text-2xl">{feature.icon}</span>
                <div className="space-y-1">
                  <h4 className="font-bold text-on-primary">{feature.title}</h4>
                  <p className="text-sm text-inverse-on-surface leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6 relative z-10">
            <button className="w-full py-5 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-full font-bold text-lg hover:scale-[1.02] transition-transform shadow-xl shadow-primary/20">
              Start 7-Day Free Trial
            </button>
            <p className="text-center text-sm text-inverse-on-surface">Only $4.99/month after trial. Cancel anytime.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen pb-32">
      <main className="max-w-2xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'summary' && renderSummary()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'premium' && renderPremium()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-background/80 backdrop-blur-xl border-t border-outline-variant/10 rounded-t-[2.5rem] px-6 pb-8 pt-4 flex justify-around items-center shadow-2xl">
        {[
          { id: 'home', icon: 'home_max', label: 'Home' },
          { id: 'history', icon: 'history_edu', label: 'History' },
          { id: 'summary', icon: 'analytics', label: 'Analysis' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex flex-col items-center justify-center px-6 py-3 rounded-2xl transition-all duration-300",
              activeTab === tab.id ? "text-primary bg-surface-container-highest" : "text-on-surface-variant"
            )}
          >
            <span className={cn("material-symbols-outlined mb-1", activeTab === tab.id && "fill-1")}>{tab.icon}</span>
            <span className="font-label text-[10px] uppercase tracking-widest font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface-container-lowest w-full max-w-md relative z-10 p-8 rounded-[2rem] shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-2xl font-bold text-on-surface">New Reflection</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-surface-container rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">What happened?</label>
                  <textarea
                    autoFocus
                    value={newMistakeText}
                    onChange={(e) => setNewMistakeText(e.target.value)}
                    placeholder="I hesitated during the team presentation..."
                    className="w-full p-6 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none min-h-[150px] resize-none text-on-surface"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-5 py-2.5 rounded-full text-sm font-bold transition-all",
                          selectedCategory === cat 
                            ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={addMistake}
                disabled={!newMistakeText.trim()}
                className="w-full py-5 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-full font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
              >
                Save Reflection
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
