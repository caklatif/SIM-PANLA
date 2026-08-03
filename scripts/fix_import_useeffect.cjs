const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

if (content.includes("import React, { useState, useRef }") || content.includes("import { useState, useRef }")) {
    content = content.replace(/useState, useRef/g, "useState, useRef, useEffect");
}

fs.writeFileSync(file, content);
