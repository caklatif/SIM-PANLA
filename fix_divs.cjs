const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const strToFind = `                    )}
                  </div>`;
const replacement = `                    )}
                  </div>
                </div>`;

const lastIdx = code.indexOf('                  </div>', code.indexOf('Menunggu Scan...</h3>'));
if (lastIdx !== -1) {
    code = code.substring(0, lastIdx) + '                  </div>\n                </div>' + code.substring(lastIdx + '                  </div>'.length);
    fs.writeFileSync('pages/PresensiQR.tsx', code);
    console.log("Added missing closing div");
}
