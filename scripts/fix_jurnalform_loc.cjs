const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, useLocation } from 'react-router-dom';");

const target = `const JurnalForm: React.FC = () => {
  const navigate = useNavigate();
  const { profile, academicYear, semester , activeScheduleVersion , semesterStart, semesterEnd } = useAuth();`;
const replacement = `const JurnalForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, academicYear, semester , activeScheduleVersion , semesterStart, semesterEnd } = useAuth();`;
content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed JurnalForm Location');
