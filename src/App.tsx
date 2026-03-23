import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Baby, 
  CloudUpload, 
  FileText, 
  Trophy, 
  Minus, 
  Plus, 
  Sparkles, 
  History, 
  Bell, 
  User, 
  RefreshCw, 
  X,
  Timer,
  Cloud,
  Star,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { View, Winner, HistoryRecord } from './types';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [currentView, setCurrentView] = useState<View>('setup');
  const [winnerCount, setWinnerCount] = useState(1);
  const [manualList, setManualList] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isWishingActive, setIsWishingActive] = useState(false);
  const [totalBlessings, setTotalBlessings] = useState(() => {
    const saved = localStorage.getItem('totalBlessings');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [currentWinners, setCurrentWinners] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    const saved = localStorage.getItem('wishingHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const h = await res.json();
          if (Array.isArray(h)) setHistory(h);
        }
      } catch {}
      try {
        const resS = await fetch('/api/stats');
        if (resS.ok) {
          const s = await resS.json();
          if (s && typeof s.totalBlessings === 'number') setTotalBlessings(s.totalBlessings);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem('totalBlessings', totalBlessings.toString());
  }, [totalBlessings]);

  useEffect(() => {
    localStorage.setItem('wishingHistory', JSON.stringify(history));
  }, [history]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartWishing = () => {
    setIsWishingActive(true);
    setTotalBlessings(prev => prev + 1);
    setCurrentView('wishing');
  };

  const handleWishingComplete = async (winners: string[]) => {
    setCurrentWinners(winners);
    setIsWishingActive(false);
    setCurrentView('winners');
    try {
      const r = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winners }),
      });
      if (r.ok) {
        const rec: HistoryRecord = await r.json();
        setHistory(prev => [rec, ...prev]);
      } else {
        throw new Error('server error');
      }
    } catch {
      const localRec: HistoryRecord = {
        id: `local-${Date.now()}`,
        date: new Date().toLocaleString('zh-CN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        winners,
      };
      setHistory(prev => [localRec, ...prev]);
    }
    try {
      const s = await fetch('/api/stats').then(res => res.ok ? res.json() : null);
      if (s && typeof s.totalBlessings === 'number') setTotalBlessings(s.totalBlessings);
    } catch {}
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeduplicate = () => {
    setManualList(prev => {
      const names = prev.split(/\r?\n/).map(name => name.trim()).filter(name => name !== '');
      const uniqueNames = Array.from(new Set(names));
      return uniqueNames.join('\n');
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImage(true);
    try {
      const processFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Data = e.target?.result?.toString().split(',')[1];
            if (!base64Data) {
              resolve('');
              return;
            }

            try {
              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [
                  {
                    parts: [
                      { text: "这是一个抖音聊天界面的截图。请识别并提取出所有用户的名字或昵称。每行返回一个名字，不要有其他解释文字。" },
                      {
                        inlineData: {
                          mimeType: file.type,
                          data: base64Data
                        }
                      }
                    ]
                  }
                ]
              });
              resolve(response.text?.trim() || '');
            } catch (err) {
              console.error("AI error for file:", file.name, err);
              resolve('');
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const results = await Promise.all(Array.from(files).map(processFile));
      // Split by any newline character and trim each name
      const allNewNames = results
        .flatMap(text => text.split(/\r?\n/))
        .map(name => name.trim())
        .filter(name => name !== '');

      if (allNewNames.length > 0) {
        setManualList(prev => {
          // Split existing list by any newline and trim
          const existingNames = prev.split(/\r?\n/).map(name => name.trim()).filter(name => name !== '');
          // Create a Set to ensure uniqueness across both existing and new names
          const uniqueNames = Array.from(new Set([...existingNames, ...allNewNames]));
          return uniqueNames.join('\n');
        });
      }
    } catch (error) {
      console.error("Batch processing error:", error);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple
        onChange={handleFileChange}
      />
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl flex items-center justify-between px-6 h-16 shadow-[0_4px_20px_rgba(248,187,208,0.15)]">
        <div className="flex items-center gap-2">
          <Baby className="text-primary w-6 h-6" />
          <span className="font-headline font-black tracking-tight text-xl text-primary">允儿粉丝许愿池</span>
        </div>
        <div className="flex items-center gap-3">
          {currentView === 'winners' && (
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-variant text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="text-xs font-bold font-label">历史记录</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-20 pb-32 px-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {currentView === 'setup' && (
            <SetupView 
              key="setup" 
              winnerCount={winnerCount} 
              setWinnerCount={setWinnerCount}
              manualList={manualList}
              setManualList={setManualList}
              onStart={handleStartWishing}
              onUpload={handleUploadClick}
              onDeduplicate={handleDeduplicate}
              isProcessing={isProcessingImage}
            />
          )}
          {currentView === 'wishing' && (
            <WishingView 
              key="wishing" 
              onComplete={handleWishingComplete} 
              winnerCount={winnerCount}
              manualList={manualList}
              isWishingActive={isWishingActive}
              totalBlessings={totalBlessings}
            />
          )}
          {currentView === 'winners' && (
            <WinnersView 
              key="winners" 
              winners={currentWinners} 
              onRestart={() => setCurrentView('setup')}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white/70 backdrop-blur-xl rounded-t-[3rem] pb-safe shadow-[0_-8px_30px_rgba(248,187,208,0.1)]">
        <NavItem 
          active={currentView === 'setup'} 
          icon={<Settings className="w-6 h-6" />} 
          label="设置" 
          onClick={() => setCurrentView('setup')}
        />
        <NavItem 
          active={currentView === 'wishing'} 
          icon={<Sparkles className="w-6 h-6" />} 
          label="许愿中" 
          onClick={() => currentView !== 'wishing' && setCurrentView('wishing')}
        />
        <NavItem 
          active={currentView === 'winners'} 
          icon={<Trophy className="w-6 h-6" />} 
          label="中奖名单" 
          onClick={() => currentWinners.length > 0 && setCurrentView('winners')}
        />
      </nav>

      {/* History Drawer */}
      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
      />
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-5 py-2 rounded-full transition-all duration-300 ${
        active 
          ? 'bg-primary-container/30 text-primary shadow-[0_0_15px_rgba(248,187,208,0.5)] scale-110' 
          : 'text-outline hover:bg-primary-container/10'
      }`}
    >
      {icon}
      <span className="font-label text-[11px] font-bold uppercase tracking-widest mt-1">{label}</span>
    </button>
  );
}

function SetupView({ winnerCount, setWinnerCount, manualList, setManualList, onStart, onUpload, onDeduplicate, isProcessing }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-10 cloud-bg min-h-[calc(100vh-12rem)]"
    >
      <div className="text-center relative z-10">
        <h1 className="font-headline font-black text-4xl md:text-5xl text-on-surface tracking-tight mb-2">开启许愿池</h1>
        <p className="text-on-surface-variant font-medium">汇聚社区力量，让魔法开始生效。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Smart Setup */}
        <div className="md:col-span-2 bg-surface-container-low p-8 rounded-xl border border-white/40 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CloudUpload className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <h3 className="font-headline font-bold text-xl text-primary mb-2">智能设置</h3>
            <p className="text-sm text-on-surface-variant mb-6 max-w-sm">有粉丝名单的截图吗？我们将使用 AI 自动识别并提取名单进行抽奖。</p>
            <button 
              onClick={onUpload}
              disabled={isProcessing}
              className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full font-bold flex items-center justify-center gap-3 shadow-lg hover:opacity-90 transition-all active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CloudUpload className="w-5 h-5" />
              )}
              {isProcessing ? '正在识别名单...' : '上传粉丝名单截图'}
            </button>
          </div>
        </div>

        {/* Manual Input */}
        <div className="bg-surface-container-low p-6 rounded-xl border border-white/40 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="text-secondary w-5 h-5" />
              <h3 className="font-headline font-bold text-lg text-on-surface">手动输入名单</h3>
            </div>
            <button 
              onClick={onDeduplicate}
              className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              一键去重
            </button>
          </div>
          <textarea 
            value={manualList}
            onChange={(e) => setManualList(e.target.value)}
            className="w-full flex-grow bg-surface-container-highest border-none rounded-lg p-4 text-sm font-body focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-outline resize-none" 
            placeholder="输入用户名，每行一个..." 
            rows={6}
          />
          <p className="mt-2 text-[11px] text-outline font-medium uppercase tracking-wider">示例: @mamabear_2024</p>
        </div>

        {/* Winner Count */}
        <div className="bg-surface-container-low p-6 rounded-xl border border-white/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="text-tertiary w-5 h-5" />
              <h3 className="font-headline font-bold text-lg text-on-surface">中奖人数</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">今天我们要满足多少个愿望呢？</p>
          </div>
          <div className="flex items-center justify-between bg-surface-container-highest rounded-full p-2">
            <button 
              onClick={() => setWinnerCount(Math.max(1, winnerCount - 1))}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-primary hover:bg-primary-container transition-colors active:scale-90"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="font-headline font-black text-3xl text-on-surface">{winnerCount}</span>
            <button 
              onClick={() => setWinnerCount(winnerCount + 1)}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-primary hover:bg-primary-container transition-colors active:scale-90"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button 
          onClick={onStart}
          className="w-full max-w-sm py-5 px-8 bg-gradient-to-br from-primary via-primary to-primary-dim text-on-primary rounded-full font-headline font-black text-xl shadow-[0_12px_40px_rgba(146,63,95,0.3)] hover:translate-y-[-2px] hover:shadow-[0_20px_50px_rgba(146,63,95,0.4)] transition-all active:scale-95 duration-300"
        >
          开启许愿
        </button>
        <p className="text-[11px] font-label font-semibold text-outline uppercase tracking-widest">AI随机抽取，公平公正</p>
      </div>
    </motion.div>
  );
}

function WishingView({ onComplete, winnerCount, manualList, isWishingActive, totalBlessings }: any) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentName, setCurrentName] = useState('果果妈');
  const hasCompleted = useRef(false);

  const names = React.useMemo(() => 
    manualList.split(/\r?\n/).map((n: string) => n.trim()).filter((n: string) => n !== ''),
    [manualList]
  );

  const displayNames = React.useMemo(() => 
    names.length > 0 ? names : ['小草莓', '好孕连连', '准妈妈A', '宝贝计划', '果果妈', '好孕来', '平安喜乐', '龙宝宝'],
    [names]
  );

  // Reset completion flag when wishing becomes active
  useEffect(() => {
    if (isWishingActive) {
      hasCompleted.current = false;
      setTimeLeft(10);
    }
  }, [isWishingActive]);

  // Timer logic
  useEffect(() => {
    if (!isWishingActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const nameSwitcher = setInterval(() => {
      setCurrentName(displayNames[Math.floor(Math.random() * displayNames.length)]);
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(nameSwitcher);
    };
  }, [isWishingActive, displayNames]);

  // Completion logic - triggered only once when timeLeft hits 0
  useEffect(() => {
    if (isWishingActive && timeLeft === 0 && !hasCompleted.current) {
      hasCompleted.current = true;
      const pool = names.length > 0 ? names : ['Sarah & James Miller', 'Elena Rodriguez', 'David Chen'];
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const winners = shuffled.slice(0, winnerCount);
      onComplete(winners);
    }
  }, [timeLeft, isWishingActive, names, winnerCount, onComplete]);

  if (!isWishingActive) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] relative"
      >
        <div className="text-center mb-12">
          <span className="font-headline text-outline uppercase tracking-[0.2em] font-bold text-sm">许愿池静候中</span>
          <h1 className="font-headline text-4xl md:text-5xl font-black text-on-surface mt-2 tracking-tight">当前未进行许愿</h1>
        </div>
        
        <div className="relative group opacity-50 grayscale">
          <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full glass-panel border-surface-container-highest border-[8px] flex items-center justify-center">
            <Sparkles className="w-20 h-20 text-outline" />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 w-full">
          <div className="bg-surface-container-low p-6 rounded-xl text-left border border-outline-variant/10">
            <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant block mb-2">累计祈愿</span>
            <span className="font-headline text-2xl font-bold text-secondary">{totalBlessings}</span>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl text-left border border-outline-variant/10">
            <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant block mb-2">当前参与人数</span>
            <span className="font-headline text-2xl font-bold text-primary">{names.length}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] relative"
    >
      <div className="absolute top-0 right-0 bg-primary/10 px-4 py-1.5 rounded-full flex items-center gap-2">
        <Timer className="w-4 h-4 text-primary" />
        <span className="font-headline font-bold text-primary">{timeLeft}秒</span>
      </div>

      <div className="text-center mb-12">
        <span className="font-headline text-primary-dim uppercase tracking-[0.2em] font-bold text-sm">好孕传送中</span>
        <h1 className="font-headline text-4xl md:text-5xl font-black text-on-surface mt-2 tracking-tight">正在接好孕中...</h1>
      </div>

      <div className="relative group">
        <div className="absolute -inset-10 bg-gradient-to-tr from-primary/20 via-tertiary/20 to-secondary/20 blur-[50px] opacity-70"></div>
        <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full glass-panel border-surface-container-highest border-[8px] flex items-center justify-center well-glow">
          <div className="flex flex-col items-center justify-center w-full h-full relative">
            <motion.div 
              key={currentName}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              className="font-headline font-black text-primary tracking-tighter text-center whitespace-nowrap px-4 text-4xl md:text-6xl"
            >
              {currentName}
            </motion.div>
            <div className="h-1 w-12 bg-primary/20 rounded-full mt-4"></div>
            <div className="mt-4 flex gap-1">
              <Star className="w-5 h-5 text-tertiary fill-tertiary animate-pulse" />
              <Star className="w-5 h-5 text-tertiary fill-tertiary animate-pulse" />
              <Star className="w-5 h-5 text-tertiary fill-tertiary animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-4 w-full">
        <div className="bg-surface-container-low p-6 rounded-xl text-left border border-outline-variant/10">
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant block mb-2">累计祈愿</span>
          <span className="font-headline text-2xl font-bold text-secondary">{totalBlessings}</span>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl text-left border border-outline-variant/10">
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant block mb-2">当前参与人数</span>
          <span className="font-headline text-2xl font-bold text-primary">{names.length}</span>
        </div>
      </div>

      <p className="mt-10 text-on-surface-variant max-w-md text-sm leading-relaxed text-center">
        好孕算法正在收集所有的爱与好运，幸运儿即将在几秒后揭晓！
      </p>
    </motion.div>
  );
}

function WinnersView({ winners, onRestart }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-12 bg-confetti-pattern min-h-[calc(100vh-12rem)] py-8"
    >
      <div className="text-center">
        <div className="inline-block p-4 rounded-full bg-tertiary-container mb-6 shadow-sm">
          <Sparkles className="w-10 h-10 text-tertiary fill-tertiary" />
        </div>
        <h1 className="font-headline font-black text-3xl md:text-4xl text-primary mb-4 tracking-tight leading-tight">恭喜接到好孕的准爸爸准妈妈！</h1>
        <p className="text-on-surface-variant text-base max-w-md mx-auto">星光闪耀，许愿池已为您开启。以下是本次抽奖的幸运儿。</p>
      </div>

      <div className="space-y-6">
        {winners.map((name: string, i: number) => (
          <motion.div 
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.2 }}
            className={`bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_30px_rgba(146,63,95,0.08)] flex items-center justify-center border-l-8 relative overflow-hidden h-24 ${
              i % 3 === 0 ? 'border-primary' : i % 3 === 1 ? 'border-secondary -rotate-1' : 'border-tertiary rotate-1'
            }`}
          >
            <h3 className="font-headline font-bold text-xl text-on-surface">{name}</h3>
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <button 
          onClick={onRestart}
          className="group relative px-10 py-5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all transform active:scale-95 duration-200"
        >
          <span className="relative z-10 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            重新开始许愿
          </span>
        </button>
      </div>
    </motion.div>
  );
}

function HistoryDrawer({ isOpen, onClose, history }: { isOpen: boolean, onClose: () => void, history: HistoryRecord[] }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-[3rem] p-8 max-h-[85vh] overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border-t border-primary/10"
          >
            <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-8 opacity-50" />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black font-headline text-primary flex items-center gap-2">
                <History className="w-6 h-6" />
                历史中奖记录
              </h2>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              {history.map((record) => (
                <div key={record.id} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-secondary px-3 py-1 rounded-full bg-secondary-container/50">{record.date}</span>
                    <span className="text-xs text-on-surface-variant">共 {record.winners.length} 位幸运儿</span>
                  </div>
                  <p className="text-on-surface font-medium">{record.winners.join(', ')}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-xs text-on-surface-variant italic">记录已为您永久保存</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
