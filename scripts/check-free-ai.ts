import 'dotenv/config';
import { verifiedFreeKey, FreeAiUnavailable } from '../server/utils/freeTierAi';
// Configuration check only. Never generates content or consumes a Gemini quota slot.
verifiedFreeKey().then(() => console.log('Free-tier key verified: owning project has no linked billing account.'))
  .catch(error => {
    // Only print our own diagnostics, never a raw provider error containing URLs/keys.
    console.error(error instanceof FreeAiUnavailable ? error.message : 'Free-tier verification failed. Check server configuration.');
    console.error('No Gemini generation was requested. Catalog suggestions remain available.');
    process.exitCode = 1;
  });
