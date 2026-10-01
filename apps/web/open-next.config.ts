import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Le landing leggono dati vivi da Supabase a ogni richiesta: non c'e' nulla
// da mettere in cache tra una costruzione e l'altra, quindi niente bucket R2.
export default defineCloudflareConfig({});
