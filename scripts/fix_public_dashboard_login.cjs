const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// We need to inject the Login Modal logic.
// Let's add states to PublicDashboard
content = content.replace(
    /const \[stats, setStats\] = useState<PublicStats \| null>\(null\);/,
    `const [stats, setStats] = useState<PublicStats | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginViewMode, setLoginViewMode] = useState<'selection' | 'form'>('selection');
  const [selectedRoleLabel, setSelectedRoleLabel] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
`
);

// Include required lucide icons if missing
// LogIn, Loader2, BookOpen, AlertCircle, X, School, ChevronDown, ChevronRight, Bookmark
content = content.replace(
    /import \{ LogIn, Loader2, BookOpen, AlertCircle, X, School, ChevronDown, ChevronRight, Bookmark \} from 'lucide-react';/,
    `import { LogIn, Loader2, BookOpen, AlertCircle, X, School, ChevronDown, ChevronRight, Bookmark, Lock, User, ArrowRight, ShieldCheck, GraduationCap, MonitorPlay, Shield, ChevronLeft, Eye, EyeOff } from 'lucide-react';`
);

// Add the login handler logic
const loginLogic = `
  const handleRoleSelect = (role: 'guru' | 'operator' | 'admin') => {
      if (role === 'operator') {
          navigate('/operator-dashboard');
      } else {
          setSelectedRoleLabel(role === 'admin' ? 'Administrator' : 'Guru / Staf');
          setLoginViewMode('form');
      }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      const { error } = await signIn(userId, password);
      if (error) {
        if (error.message === 'Failed to fetch') {
           setLoginError('Gagal terhubung ke Database.');
        } else if (error.message.includes('Invalid login')) {
           setLoginError('NIP atau Password salah.');
        } else {
           setLoginError(error.message);
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };
`;

content = content.replace(
    /const handleClassClick = \(grade: string\) => \{/,
    `${loginLogic}\n  const handleClassClick = (grade: string) => {`
);

// Update the Login button in PublicDashboard to show modal instead of navigate
content = content.replace(
    /onClick=\{\(\) => navigate\('\/login'\)\}/,
    `onClick={() => setShowLoginModal(true)}`
);

// Add the Login Modal JSX at the end, right before the last closing </div>
const loginModalJSX = `
      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowLoginModal(false)}>
           <div className="bg-transparent w-full max-w-lg flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
               {loginViewMode === 'selection' ? (
                  <div className="w-full grid gap-4 animate-fade-in">
                      <div className="flex justify-between items-center mb-2">
                          <h2 className="text-xl font-extrabold text-white">Masuk Sebagai</h2>
                          <button onClick={() => setShowLoginModal(false)} className="text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X size={24}/></button>
                      </div>
                      
                      <button 
                        onClick={() => handleRoleSelect('guru')}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-500/50 p-5 rounded-3xl shadow-xl flex items-center gap-5 transition-all group"
                      >
                          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <GraduationCap size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">Guru / Tenaga Pendidik</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Masuk untuk mengisi jurnal & absensi.</p>
                          </div>
                          <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-blue-500">
                              <ArrowRight size={24} />
                          </div>
                      </button>

                      <button 
                        onClick={() => handleRoleSelect('operator')}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-orange-300 dark:hover:border-orange-500/50 p-5 rounded-3xl shadow-xl flex items-center gap-5 transition-all group"
                      >
                          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <MonitorPlay size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400">Operator Monitor</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dashboard monitoring jadwal real-time.</p>
                          </div>
                          <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-orange-500">
                              <ArrowRight size={24} />
                          </div>
                      </button>

                      <button 
                        onClick={() => handleRoleSelect('admin')}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-slate-400 dark:hover:border-slate-500/50 p-5 rounded-3xl shadow-xl flex items-center gap-5 transition-all group"
                      >
                          <div className="w-16 h-16 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Shield size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Administrator</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pengaturan sistem dan data master.</p>
                          </div>
                          <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-800 dark:group-hover:text-white">
                              <ArrowRight size={24} />
                          </div>
                      </button>
                  </div>
               ) : (
                  <div className="w-full max-w-sm bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-slate-700 overflow-hidden relative animate-fade-in transition-colors">
                      <div className="p-8">
                          <div className="flex justify-between items-start mb-6">
                              <button 
                                onClick={() => setLoginViewMode('selection')}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors -ml-2"
                                title="Kembali"
                              >
                                  <ChevronLeft size={24} />
                              </button>
                              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors -mr-2"><X size={24}/></button>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center gap-1 mb-6 -mt-4">
                              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full mb-2">
                                  <ShieldCheck size={28} />
                              </div>
                              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Login {selectedRoleLabel}</h2>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Silakan masukkan kredensial Anda.</p>
                          </div>

                          <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div>
                              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">User ID (NIP)</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  value={userId}
                                  onChange={(e) => setUserId(e.target.value)}
                                  className="pl-12 block w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3.5 text-slate-800 dark:text-white text-sm font-bold transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600 placeholder:font-normal"
                                  placeholder="Contoh: 19870101..."
                                  required
                                  autoFocus
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Password</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                  type={showPassword ? "text" : "password"}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="pl-12 pr-12 block w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3.5 text-slate-800 dark:text-white text-sm font-bold transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600 placeholder:font-normal"
                                  placeholder="Masukkan Password"
                                  required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer z-10"
                                    tabIndex={-1}
                                    title={showPassword ? "Sembunyikan" : "Lihat Password"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                              </div>
                            </div>

                            {loginError && (
                              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                                <AlertCircle size={18} className="flex-shrink-0" />
                                <span>{loginError}</span>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-[#3B82F6] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 dark:shadow-none mt-4 active:translate-y-0.5"
                            >
                              {isSubmitting ? 'Memproses...' : (
                                <>
                                  Masuk Aplikasi <ArrowRight size={20} />
                                </>
                              )}
                            </button>
                          </form>
                      </div>
                  </div>
               )}
           </div>
        </div>
      )}
`;

content = content.replace(
    /<\/div>\n\s*\);\n\};\n\nexport default PublicDashboard;/m,
    `${loginModalJSX}\n    </div>\n  );\n};\n\nexport default PublicDashboard;`
);

fs.writeFileSync(file, content);
console.log('Fixed PublicDashboard Login modal');
