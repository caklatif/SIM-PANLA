const fs = require('fs');
let code = fs.readFileSync('./pages/Dashboard.tsx', 'utf8');

const replacement = `                        </div>
                    </div>
                </div>
                
                {!isAdmin && (
                    <div className="w-full mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-5 flex flex-col gap-4 relative z-10 shadow-inner">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-purple-100 uppercase tracking-wider">Kinerja Bulan {currentMonthName}</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="w-10 h-10 mb-2 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Users size={20} strokeWidth={2} />
                                </div>
                                <div className="flex items-baseline gap-1 justify-center">
                                    <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalMeetings}</span>
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-500 uppercase mt-1 tracking-wider">KALI<br/>PERTEMUAN</span>
                            </div>
                            
                            <div className="bg-white rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="w-10 h-10 mb-2 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <ClipboardList size={20} strokeWidth={2} />
                                </div>
                                <div className="flex items-baseline gap-1 justify-center">
                                    <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalJpFilled}</span>
                                    <span className="text-xs font-bold text-slate-400">/ {stats.totalJpTarget}</span>
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-500 uppercase mt-1 tracking-wider">TOTAL JP</span>
                            </div>

                            <div className="bg-white rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="w-10 h-10 mb-2 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <Star size={20} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col items-center justify-center mt-1">
                                    <span className={\`text-[10px] font-black uppercase tracking-wide text-center leading-tight \${
                                        performanceStatus.includes('SANGAT BAIK') ? 'text-emerald-600' :
                                        performanceStatus.includes('BAIK') ? 'text-blue-600' :
                                        performanceStatus.includes('CUKUP') ? 'text-amber-600' :
                                        'text-purple-600'
                                    }\`}>
                                        {performanceStatus.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* MAIN WIDGETS */}`;

code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\{\!isAdmin && \([\s\S]*?\{\/\* MAIN WIDGETS \*\//, replacement);
fs.writeFileSync('./pages/Dashboard.tsx', code);
