const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../contexts/AuthContext.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldSignOut = `  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setSession(null);
  };`;

const newSignOut = `  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
          await supabase.auth.signOut();
      } catch (err) {
          console.warn("Sign out error", err);
      }
    }
    setProfile(null);
    setSession(null);
  };`;

content = content.replace(oldSignOut, newSignOut);
fs.writeFileSync(file, content);
console.log('Fixed signOut error catch');
