import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Home, Newspaper, Bot, Search, Bell, User, LogIn, LogOut, ChevronRight } from 'lucide-react';
import { cn } from './lib/utils';
import { Match, NewsItem } from './types';
import { getFootballAssistant, fetchLiveNews } from './services/geminiService';
import { auth, db } from './services/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import ReactMarkdown from 'react-markdown';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = React.useState('home');
  const [aiInput, setAiInput] = React.useState('');
  const [aiResponse, setAiResponse] = React.useState('');
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Auth Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Matches Listener
  React.useEffect(() => {
    const q = query(collection(db, 'matches'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      setMatches(matchesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });

    return () => unsubscribe();
  }, []);

  // News Listener (still using Gemini for now as a live source)
  React.useEffect(() => {
    const loadNews = async () => {
      const freshNews = await fetchLiveNews();
      if (freshNews && freshNews.length > 0) setNews(freshNews);
    };
    loadNews();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const logout = () => signOut(auth);

  const handleAiConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    const resp = await getFootballAssistant(aiInput);
    setAiResponse(resp);
    setIsAiLoading(false);
    setAiInput('');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-emerald-500/30" dir="rtl">
      {/* Sidebar for Desktop */}
      <aside className="fixed right-0 top-0 h-full w-64 bg-[#111114] border-l border-zinc-800 hidden md:flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-emerald-500/20">
            <Trophy className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-500">Turkisports</h1>
        </div>

        <nav className="space-y-2">
          <NavItem icon={Home} label="الرئيسية" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={Newspaper} label="الأخبار" active={activeTab === 'news'} onClick={() => setActiveTab('news')} />
          <NavItem icon={Trophy} label="المباريات" active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} />
          <NavItem icon={Bot} label="المدرب الذكي" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          {user ? (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3 px-2 py-3">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-zinc-700" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate w-24">{user.displayName}</span>
                  <span className="text-[10px] text-zinc-500">مشجع رياضي</span>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-3 px-4 py-3 bg-emerald-500 text-black rounded-xl font-bold w-full hover:bg-emerald-400 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#111114]/80 backdrop-blur-xl border-t border-zinc-800 flex justify-around p-4 md:hidden z-50">
        <NavItem icon={Home} label="" active={activeTab === 'home'} onClick={() => setActiveTab('home')} isMobile />
        <NavItem icon={Newspaper} label="" active={activeTab === 'news'} onClick={() => setActiveTab('news')} isMobile />
        <NavItem icon={Trophy} label="" active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} isMobile />
        <NavItem icon={Bot} label="" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} isMobile />
      </nav>

      {/* Main Content */}
      <main className="md:mr-64 pb-24 md:pb-6">
        {/* Header */}
        <header className="sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-40 px-6 py-4 flex items-center justify-between border-b border-zinc-900">
          <div className="flex items-center gap-4 bg-zinc-900/50 rounded-full px-4 py-2 w-full max-w-md">
            <Search className="w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="ابحث عن أندية، لاعبين، أو بطولات..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-600"
            />
          </div>
          <div className="flex items-center gap-4 mr-4">
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors relative">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#09090b]"></span>
            </button>
            {user && (
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-zinc-700 md:hidden" alt="Profile" />
            )}
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto">
          {activeTab === 'home' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-right">
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                    مباريات جارية
                  </h2>
                  <button onClick={() => setActiveTab('matches')} className="text-sm text-emerald-500 hover:underline">عرض الكل</button>
                </div>
                {matches.filter(m => m.status === 'LIVE').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.filter(m => m.status === 'LIVE').map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-900/30 rounded-2xl p-8 border border-zinc-800 text-center border-dashed">
                    <p className="text-zinc-500 text-sm italic">لا توجد مباريات مباشرة حالياً. ترقبوا الإثارة!</p>
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                    أبرز الأخبار
                  </h2>
                  <button onClick={() => setActiveTab('news')} className="text-sm text-emerald-500 hover:underline">المزيد</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {news.slice(0, 2).map((item, idx) => (
                    <NewsCard key={item.id || `news-home-${idx}`} item={item} />
                  ))}
                </div>
              </section>

              {/* AI Quick Call */}
              <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                 <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
                 <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center p-3 border border-emerald-500/30">
                      <Bot className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="flex-1 text-center md:text-right">
                      <h3 className="text-2xl font-bold mb-2">هل تبحث عن تحليل لمباراة الليلة؟</h3>
                      <p className="text-zinc-400 mb-4">اسأل "المدرب الذكي" واحصل على توقعات مبنية على البيانات والذكاء الاصطناعي.</p>
                      <button 
                        onClick={() => setActiveTab('ai')}
                        className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        ابدأ المحادثة الآن
                      </button>
                    </div>
                 </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'news' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-3xl font-bold mb-8">آخر الأخبار الرياضية</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {news.map((item, idx) => (
                  <NewsCard key={item.id || `news-list-${idx}`} item={item} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'matches' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div>
                <h3 className="text-lg font-semibold text-zinc-500 mb-4 border-b border-zinc-800 pb-2">جدول المباريات</h3>
                {matches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Trophy className="w-16 h-16 mb-4" />
                    <p>لا توجد مباريات مسجلة حالياً في قاعدة بيانات Turkisports.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto h-[calc(100vh-200px)] flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 mb-6 p-4 bg-zinc-900/40 rounded-3xl border border-zinc-800">
                {aiResponse ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{aiResponse}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <Bot className="w-16 h-16 mb-4 text-emerald-500" />
                    <p>اسألني أي شيء عن كرة القدم...</p>
                    <p className="text-xs mt-2 italic px-8">"من سيفوز بالدوري؟" - "ما هي خطة مانشستر سيتي المتوقعة؟"</p>
                  </div>
                )}
                {isAiLoading && <div className="animate-pulse text-emerald-500 font-mono">المدرب يفكر...</div>}
              </div>

              <form onSubmit={handleAiConsult} className="flex gap-3">
                <input 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="اكتب استفسارك هنا..." 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 focus:border-emerald-500 outline-none transition-all"
                />
                <button 
                  disabled={isAiLoading}
                  className="bg-emerald-500 text-black font-bold px-8 py-4 rounded-2xl hover:bg-emerald-400 transition-all disabled:opacity-50"
                >
                  إرسال
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, isMobile }: { icon: any, label: string, active: boolean, onClick: () => void, isMobile?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-right group relative",
        active ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-200")} />
      {!isMobile && <span className="text-sm font-semibold">{label}</span>}
      {active && !isMobile && <motion.div layoutId="pill" className="absolute right-0 w-1 h-6 bg-emerald-500 rounded-full" />}
    </button>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'LIVE';
  return (
    <div className="bg-[#18181b] border border-zinc-800/50 rounded-2xl p-4 hover:border-emerald-500/30 transition-all cursor-pointer group">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold px-2 py-1 bg-zinc-900 rounded">{match.competition}</span>
        {isLive && <span className="flex items-center gap-2 text-[10px] text-emerald-500 animate-pulse font-bold"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> مباشر</span>}
        {!isLive && <span className="text-[10px] text-zinc-600 font-bold uppercase">{match.time}</span>}
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">⚽</div>
             <span className="text-sm font-bold">{match.homeTeam}</span>
          </div>
          <span className="text-lg font-mono font-bold">{match.homeScore ?? '-'}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">⚽</div>
             <span className="text-sm font-bold">{match.awayTeam}</span>
          </div>
          <span className="text-lg font-mono font-bold">{match.awayScore ?? '-'}</span>
        </div>
      </div>
      
      {isLive && (
        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center text-[11px] text-zinc-400">
          <span>دقيقة: {match.time}</span>
          <button className="text-emerald-500 font-bold group-hover:underline">مركز المباراة</button>
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="bg-[#18181b] border border-zinc-800/50 rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all cursor-pointer">
      <div className="h-48 bg-zinc-800 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent"></div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <span className="bg-orange-500 text-black text-[10px] font-bold px-2 py-1 rounded">خاص</span>
          <span className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded">{item.source}</span>
        </div>
      </div>
      <div className="p-5">
        <span className="text-[10px] text-zinc-500 mb-2 block">{item.date}</span>
        <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-500 transition-colors leading-tight">{item.title}</h3>
        <p className="text-xs text-zinc-400 line-clamp-2">{item.summary}</p>
      </div>
    </div>
  );
}
