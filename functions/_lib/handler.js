import { ensureDb } from "./db.js";
import { HttpError, error } from "./auth.js";

// Prepara il database e trasforma gli errori in risposte JSON leggibili dal pannello.
export async function withDb(context, run) {
  try {
    await ensureDb(context.env);
    return await run();
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status);
    console.error(err);
    return error("Errore del server: " + (err && err.message ? err.message : "sconosciuto"), 500);
  }
}
