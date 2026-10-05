import { createSessionCookie, setSessionCookie, verifyCredentials } from '../_lib/auth.js';
import { createHandler, readJsonBody, sendError, sendSuccess } from '../_lib/http.js';
import { clearFailures, getClientKey, isBlocked, registerFailure } from '../_lib/rate-limit.js';
import { loginSchema } from '../_lib/validation.js';

export default createHandler(
  {
    POST: async (req, res) => {
      const clientKey = getClientKey(req);
      const retryAfter = isBlocked(clientKey);
      if (retryAfter !== null) {
        res.setHeader('Retry-After', String(retryAfter));
        sendError(res, 429, 'Muitas tentativas de login. Tente novamente mais tarde.');
        return;
      }

      const { username, password } = loginSchema.parse(readJsonBody(req));
      const valid = await verifyCredentials(username, password);

      if (!valid) {
        registerFailure(clientKey);
        console.warn(`[auth] Falha de login para a chave ${clientKey}`);
        sendError(res, 401, 'Usuário ou senha inválidos.');
        return;
      }

      clearFailures(clientKey);
      setSessionCookie(res, await createSessionCookie(username));
      sendSuccess(res, { username });
    },
  },
  { public: true },
);
