const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../index.html');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('shimmer')) {
    const keyframes = `
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }`;
    content = content.replace('</style>', keyframes + '\n    </style>');
    fs.writeFileSync(file, content);
}
console.log('Fixed index.html shimmer');
