const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../contexts/AuthContext.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldCatch = `      } catch (error) {
        console.warn("Auth initialization failed (likely no connection):", error);
        // Do not block app loading on auth error
        setIsLoading(false);
      }`;

const newCatch = `      } catch (error: any) {
        console.warn("Auth initialization failed:", error);
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh token')) {
            await supabase.auth.signOut().catch(() => {});
        }
        setIsLoading(false);
      }`;

content = content.replace(oldCatch, newCatch);
fs.writeFileSync(file, content);
console.log('Fixed AuthContext');
