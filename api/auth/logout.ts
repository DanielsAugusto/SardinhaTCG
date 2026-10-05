import { clearSessionCookie, setSessionCookie } from '../_lib/auth.js';
import { createHandler, sendSuccess } from '../_lib/http.js';

export default createHandler(
  {
    POST: async (_req, res) => {
      setSessionCookie(res, clearSessionCookie());
      sendSuccess(res, null);
    },
  },
  { public: true },
);
