// Gera o hash bcrypt para ADMIN_PASSWORD_HASH. A senha é digitada no terminal e não é salva.
import { createInterface } from 'node:readline';
import bcrypt from 'bcryptjs';

const MIN_LENGTH = 10;

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
      else rl.output.write('*');
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = await askHidden('Nova senha do administrador: ');
if (password.length < MIN_LENGTH) {
  console.error(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
  process.exit(1);
}

const confirmation = await askHidden('Confirme a senha: ');
if (password !== confirmation) {
  console.error('As senhas não conferem.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
// base64url evita o caractere "$", que carregadores de .env tentam expandir como variável.
const encoded = Buffer.from(hash, 'utf8').toString('base64url');
console.log('\nCopie a linha abaixo para o .env (e o valor para as Environment Variables da Vercel):\n');
console.log(`ADMIN_PASSWORD_HASH="${encoded}"`);
