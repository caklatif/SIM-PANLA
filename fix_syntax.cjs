const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

// I will just use regex to remove the extra </div> that causes syntax error
// "error TS1005: ')' expected." because there are too many closing divs!
// Wait, TS1005 ')' expected at 2842:15 usually means there's an unmatched '(' before it, or an extra '</div>' that closes a block prematurely.

const str = `                          <p className="text-base font-medium mt-2">Arahkan kartu QR siswa ke kamera.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>
        )}`;

const replaceStr = `                          <p className="text-base font-medium mt-2">Arahkan kartu QR siswa ke kamera.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}`;

code = code.replace(str, replaceStr);
fs.writeFileSync('pages/PresensiQR.tsx', code);
