const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const strToFind = `                          <div>
                            <h3 className="font-bold text-lg text-slate-300">Menunggu Scan...</h3>
                            <p className="text-sm mt-1">Arahkan kartu QR siswa ke kamera.</p>
                          </div>
                </div>
                        </div>
                      )}
                    </div>`;

const replaceStr = `                          <div>
                            <h3 className="font-bold text-lg text-slate-300">Menunggu Scan...</h3>
                            <p className="text-sm mt-1">Arahkan kartu QR siswa ke kamera.</p>
                          </div>
                        </div>
                      )}
                    </div>`;
                    
code = code.replace(strToFind, replaceStr);

const strToFindReg = `                        <div>
                          <h3 className="font-black text-2xl text-slate-500 dark:text-slate-400">Menunggu Scan...</h3>
                          <p className="text-base font-medium mt-2">Arahkan kartu QR siswa ke kamera.</p>
                        </div>
                      </div>
                    )}
                  </div>`;
const replaceStrReg = `                        <div>
                          <h3 className="font-black text-2xl text-slate-500 dark:text-slate-400">Menunggu Scan...</h3>
                          <p className="text-base font-medium mt-2">Arahkan kartu QR siswa ke kamera.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>`;

code = code.replace(strToFindReg, replaceStrReg);

fs.writeFileSync('pages/PresensiQR.tsx', code);
