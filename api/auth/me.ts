import { createHandler, sendSuccess } from '../_lib/http.js';

export default createHandler({
  GET: async (_req, res, session) => {
    sendSuccess(res, { username: session?.username });
  },
});
