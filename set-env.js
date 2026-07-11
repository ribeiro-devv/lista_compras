const fs = require('fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.warn(
    '⚠  SUPABASE_URL/SUPABASE_KEY não definidos. Mantendo os arquivos environment.ts atuais.\n' +
    '   Para injetar credenciais no build, defina as variáveis antes: ' +
    'SUPABASE_URL=... SUPABASE_KEY=... npm run build',
  );
  process.exit(0);
}

const envConfigFileProd = `export const environment = {
  production: true,
  supabaseUrl: '${url}',
  supabaseKey: '${key}'
};
`;

const envConfigFileDev = `export const environment = {
  production: false,
  supabaseUrl: '${url}',
  supabaseKey: '${key}'
};
`;

fs.writeFileSync('./src/environments/environment.prod.ts', envConfigFileProd);
fs.writeFileSync('./src/environments/environment.ts', envConfigFileDev);

console.log('environment.ts e environment.prod.ts gerados com sucesso');
