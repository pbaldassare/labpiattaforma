import { ETICHETTA_MODULO, MODULI, PREFISSO_MODULO } from "@lab/shared";

/**
 * Segnaposto della Fase 0.
 *
 * Le pagine vere arrivano in Fase 1: vetrina del venditore su /{slug} e pagine
 * prodotto su /v/, /b/, /l/, /a/. Per ora questa pagina serve a una cosa sola:
 * dimostrare che il pacchetto condiviso viene compilato correttamente da Next.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-widest text-testo-tenue uppercase">
          Fase 0 — fondamenta
        </p>
        <h1 className="text-4xl font-bold text-balance">Lab Piattaforma</h1>
        <p className="text-testo-tenue text-lg text-pretty">
          Da qui nasceranno le pagine che il venditore manda ai clienti. Ogni offerta avrà un
          indirizzo pubblico e, dove è previsto il prezzo rivenditore, un secondo indirizzo
          riservato.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-widest text-testo-tenue uppercase">
          Indirizzi previsti
        </h2>
        <ul className="divide-bordo border-bordo bg-superficie divide-y rounded-xl border">
          {MODULI.map((modulo) => (
            <li key={modulo} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="font-medium">{ETICHETTA_MODULO[modulo]}</span>
              <code className="text-testo-tenue text-sm">/{PREFISSO_MODULO[modulo]}/&#123;codice&#125;</code>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="font-medium">Vetrina del venditore</span>
            <code className="text-testo-tenue text-sm">/&#123;slug&#125;</code>
          </li>
        </ul>
      </section>
    </main>
  );
}
