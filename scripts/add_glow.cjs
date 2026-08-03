const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../index.html');
let content = fs.readFileSync(file, 'utf8');

const cssToAdd = `
      /* Animated Glow Border */
      .glow-border-container {
        position: relative;
        z-index: 0;
        border-radius: 9999px;
        overflow: hidden;
        padding: 2px;
      }
      .glow-border-container::before {
        content: '';
        position: absolute;
        z-index: -2;
        left: -50%;
        top: -50%;
        width: 200%;
        height: 200%;
        background-color: transparent;
        background-repeat: no-repeat;
        background-size: 50% 50%, 50% 50%;
        background-position: 0 0, 100% 0, 100% 100%, 0 100%;
        background-image: conic-gradient(from 0deg, transparent 0 340deg, #3b82f6 360deg);
        animation: rotate 4s linear infinite;
      }
      .glow-border-container::after {
        content: '';
        position: absolute;
        z-index: -1;
        left: 2px;
        top: 2px;
        width: calc(100% - 4px);
        height: calc(100% - 4px);
        background: inherit;
        border-radius: 9999px;
      }
      @keyframes rotate {
        100% {
          transform: rotate(360deg);
        }
      }
`;

content = content.replace('</style>', cssToAdd + '\n    </style>');
fs.writeFileSync(file, content);
console.log('Added glow border css');
