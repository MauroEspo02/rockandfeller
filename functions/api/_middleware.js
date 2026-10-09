import { withDb } from "../_lib/handler.js";

export const onRequest = (context) => withDb(context, () => context.next());
