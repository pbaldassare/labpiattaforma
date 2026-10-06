import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ETICHETTA_ALIMENTAZIONE,
  ETICHETTA_CAMBIO,
  ETICHETTA_FORMULA,
  ETICHETTA_MODULO,
  ETICHETTA_RISCHIO,
  ETICHETTA_SERVIZIO,
  NON_COMPRESO,
  fn,
  formattaDurataPolizza,
  formattaEuro,
  formattaGiorno,
  formattaNumero,
  type Alimentazione,
  type Cambio,
  type DatiAssicurazione,
  type DatiNoleggioBreve,
  type DatiNoleggioLungo,
  type FormulaAcquisto,
  type Modulo,
  type TipoCliente,
} from '@lab/shared';

import { BloccoIcona } from '@/components/base';
import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { urlFoto } from '@/lib/foto';
import { supabase } from '@/lib/supabase';
import { colori, gradienti, raggio, spazi, stiliTema, suGradiente, testi } from '@/lib/tema';

interface DatiPreventivo {
  preventivo: {
    numero: number;
    formula: FormulaAcquisto | null;
    tipo_cliente: TipoCliente;
    prezzo_cent: number;
    firma_tracciato: string | null;
    firmato_il: string | null;
    creato_il: string;
    doc_identita: boolean;
    doc_reddito: boolean;
    doc_passaggio: boolean;
  };
  modulo: Modulo;
  cliente: { nome: string; telefono: string | null; email: string | null } | null;
  venditore: {
    nome: string;
    ragione_sociale: string | null;
    piva_cf: string | null;
    telefono: string | null;
    email: string | null;
    rui: string | null;
  } | null;
  titolo: string | null;
  offerta: {
    vendita: {
      marca: string;
      modello: string;
      chilometri: number | null;
      anno: number | null;
      alimentazione: Alimentazione | null;
      cambio: Cambio | null;
    } | null;
    breve: DatiNoleggioBreve | null;
    lungo: DatiNoleggioLungo | null;
    assicurazione: DatiAssicurazione | null;
    foto: string[];
  } | null;
  prenotazione: {
    dal: string;
    al: string;
    giorni: number;
    tariffa_cent: number;
    totale_cent: number;
    deposito_cent: number;
  } | null;
}

/**
 * I colori del documento, sempre quelli del tema chiaro: e' un foglio da
 * mostrare e stampare, non una schermata dell'app.
 */
const TINTA: Record<Modulo, { forte: string; tenue: string }> = {
  vendita: { forte: '#4D6B00', tenue: '#F0FBD0' },
  noleggio_breve: { forte: '#C2410C', tenue: '#FFEDD5' },
  noleggio_lungo: { forte: '#6D28D9', tenue: '#EDE9FE' },
  assicurazioni: { forte: '#0369A1', tenue: '#E0F2FE' },
};

const VOCE_IMPORTO: Record<Modulo, string> = {
  vendita: 'Prezzo',
  noleggio_breve: 'Totale noleggio',
  noleggio_lungo: 'Canone mensile',
  assicurazioni: 'Premio',
};

function dataLunga(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * La firma salvata e' un tracciato in pixel del riquadro in cui e' stata
 * fatta, che cambia da telefono a telefono: l'ingombro si ricava dai punti.
 */
function viewBoxFirma(tracciato: string): string {
  const numeri = (tracciato.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = numeri.filter((_, i) => i % 2 === 0);
  const ys = numeri.filter((_, i) => i % 2 === 1);
  if (xs.length === 0) return '0 0 100 40';
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return `${x0 - 8} ${y0 - 8} ${x1 - x0 + 16} ${y1 - y0 + 16}`;
}

type Dato = { etichetta: string; valore: string };

/**
 * In stampa si vede solo il foglio: intestazione dell'app, pulsanti e fondo
 * spariscono, e i colori della testata restano (i browser di norma tolgono
 * gli sfondi per risparmiare inchiostro).
 */
const CSS_STAMPA = `
@media print {
  body * { visibility: hidden !important; }
  [data-stampa], [data-stampa] * { visibility: visible !important; }
  [data-stampa] { position: absolute !important; left: 50%; top: 0; width: 640px; transform: translateX(-50%); box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}`;

function useCssStampa() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = (globalThis as unknown as { document?: Document }).document;
    if (!doc) return;
    const stile = doc.createElement('style');
    stile.textContent = CSS_STAMPA;
    doc.head.appendChild(stile);
    return () => stile.remove();
  }, []);
}

/** L'attributo data-stampa che il CSS qui sopra lascia visibile (solo sul web). */
const SEGNO_STAMPA = { dataSet: { stampa: 'si' } } as object;

/** I dati che contano per quel prodotto, nell'ordine in cui il cliente li cerca. */
function datiDelProdotto(d: DatiPreventivo): Dato[] {
  const o = d.offerta;
  const lista: (Dato | null)[] = [];
  if (d.modulo === 'vendita' && o?.vendita) {
    const v = o.vendita;
    lista.push(
      v.chilometri != null ? { etichetta: 'Chilometri', valore: `${formattaNumero(v.chilometri)} km` } : null,
      v.anno != null ? { etichetta: 'Anno', valore: String(v.anno) } : null,
      v.alimentazione ? { etichetta: 'Alimentazione', valore: ETICHETTA_ALIMENTAZIONE[v.alimentazione] } : null,
      v.cambio ? { etichetta: 'Cambio', valore: ETICHETTA_CAMBIO[v.cambio] } : null
    );
  }
  if (d.modulo === 'noleggio_breve' && o?.breve) {
    const b = o.breve;
    const giorni = d.prenotazione?.giorni ?? null;
    lista.push(
      b.km_inclusi_giorno != null
        ? {
            etichetta: 'Km inclusi',
            valore: giorni
              ? `${formattaNumero(b.km_inclusi_giorno * giorni)} km (${formattaNumero(b.km_inclusi_giorno)}/giorno)`
              : `${formattaNumero(b.km_inclusi_giorno)} al giorno`,
          }
        : null,
      b.costo_km_extra_cent != null
        ? { etichetta: 'Km in più', valore: `${(b.costo_km_extra_cent / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} al km` }
        : null,
      (d.prenotazione?.deposito_cent ?? b.deposito_cent ?? 0) > 0
        ? { etichetta: 'Deposito', valore: formattaEuro(d.prenotazione?.deposito_cent ?? b.deposito_cent!) }
        : null,
      b.eta_minima != null ? { etichetta: 'Età minima', valore: `${b.eta_minima} anni` } : null,
      b.patente_anni != null ? { etichetta: 'Patente da', valore: `${b.patente_anni} anni` } : null
    );
  }
  if (d.modulo === 'noleggio_lungo' && o?.lungo) {
    const l = o.lungo;
    lista.push(
      l.anticipo_cent != null ? { etichetta: 'Anticipo', valore: formattaEuro(l.anticipo_cent) } : null,
      l.tempi_consegna ? { etichetta: 'Consegna', valore: l.tempi_consegna } : null,
      l.riscatto_previsto
        ? {
            etichetta: 'Riscatto finale',
            valore: l.riscatto_valore_cent != null ? formattaEuro(l.riscatto_valore_cent) : 'Previsto',
          }
        : null
    );
  }
  if (d.modulo === 'assicurazioni' && o?.assicurazione) {
    const a = o.assicurazione;
    const durata = formattaDurataPolizza(a.durata_mesi);
    lista.push(
      { etichetta: 'Rischio', valore: ETICHETTA_RISCHIO[a.tipo_rischio] },
      durata ? { etichetta: 'Durata', valore: durata } : null,
      a.massimale_cent != null ? { etichetta: 'Massimale', valore: formattaEuro(a.massimale_cent) } : null,
      a.franchigia_cent != null ? { etichetta: 'Franchigia', valore: formattaEuro(a.franchigia_cent) } : null
    );
  }
  return lista.filter(Boolean) as Dato[];
}

/**
 * Il preventivo come documento: colori del modulo, foto, i dettagli che
 * contano per quel prodotto (le date del noleggio, cosa comprende il canone,
 * cosa copre la polizza) e da qui si manda o si stampa.
 */
export default function DocumentoPreventivo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<DatiPreventivo | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  useCssStampa();

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data, error } = await supabase.rpc(fn('dati_preventivo'), { p_preventivo_id: id });
      if (!vivo) return;
      if (error) setErrore(error.message);
      setD((data as DatiPreventivo | null) ?? null);
      setCaricato(true);
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  if (!caricato) {
    return (
      <View style={stili.centrato}>
        <ActivityIndicator color={colori.primario} />
      </View>
    );
  }

  if (!d || !d.cliente) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.piccolo}>{errore ?? 'Preventivo non trovato.'}</Text>
      </View>
    );
  }

  const pv = d.preventivo;
  const tinta = TINTA[d.modulo];
  const foto = d.offerta?.foto?.[0];
  const importo = `${formattaEuro(pv.prezzo_cent)}${d.modulo === 'noleggio_lungo' ? ' al mese' : ''}`;
  const dati = datiDelProdotto(d);
  const sottotitolo =
    d.modulo === 'noleggio_lungo'
      ? d.offerta?.lungo?.allestimento
      : d.modulo === 'assicurazioni'
        ? d.offerta?.assicurazione?.compagnia
        : null;
  const periodo = d.prenotazione;
  const servizi = d.modulo === 'noleggio_lungo' ? (d.offerta?.lungo?.servizi ?? []) : [];
  const garanzie = d.modulo === 'assicurazioni' ? (d.offerta?.assicurazione?.garanzie ?? []) : [];
  const comprese = garanzie.filter((g) => g.inclusa);
  const escluse = garanzie.filter((g) => !g.inclusa);
  const documenti = [
    pv.doc_identita && 'Carta d’identità e codice fiscale',
    pv.doc_reddito && 'Documento di reddito',
    pv.doc_passaggio && 'Passaggio di proprietà',
  ].filter(Boolean) as string[];

  const testoMessaggio = [
    `Ciao ${d.cliente.nome.split(' ')[0]}, ecco il preventivo n. ${pv.numero} del ${dataLunga(pv.creato_il)}.`,
    d.titolo ? `${ETICHETTA_MODULO[d.modulo]}: ${d.titolo}` : null,
    periodo ? `Dal ${formattaGiorno(periodo.dal)} al ${formattaGiorno(periodo.al)} (${periodo.giorni} ${periodo.giorni === 1 ? 'giorno' : 'giorni'})` : null,
    servizi.length ? `Compreso: ${servizi.map((s) => ETICHETTA_SERVIZIO[s]).join(', ')}` : null,
    comprese.length ? `Copre: ${comprese.map((g) => g.nome).join(', ')}` : null,
    `${VOCE_IMPORTO[d.modulo]}: ${importo}`,
    pv.formula ? `Pagamento: ${ETICHETTA_FORMULA[pv.formula]}` : null,
    d.venditore ? `\n${d.venditore.nome}${d.venditore.telefono ? ` · ${d.venditore.telefono}` : ''}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const numeroCliente = (d.cliente.telefono ?? '').replace(/[^\d]/g, '');

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      <Stack.Screen options={{ title: `Preventivo n. ${pv.numero}` }} />

      <View style={stili.foglio} {...SEGNO_STAMPA}>
        {/* La testata nel colore del modulo: si capisce di cosa si parla
            prima di leggere una parola. */}
        <LinearGradient
          colors={gradienti[d.modulo] as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={stili.testata}
        >
          <View style={stili.testataRiga}>
            <View style={stili.flex}>
              <Text style={[stili.testataModulo, { color: suGradiente[d.modulo] }]}>
                {ETICHETTA_MODULO[d.modulo].toUpperCase()}
              </Text>
              <Text style={[stili.testataTitolo, { color: suGradiente[d.modulo] }]}>Preventivo n. {pv.numero}</Text>
              <Text style={[stili.testataData, { color: suGradiente[d.modulo] }]}>{dataLunga(pv.creato_il)}</Text>
            </View>
            <View style={stili.testataIcona}>
              <BloccoIcona
                modulo={d.modulo}
                gradiente={['#FFFFFF', '#FFFFFF']}
                suGradiente={tinta.forte}
                dimensione={52}
              />
            </View>
          </View>
        </LinearGradient>

        <View style={stili.corpo}>
          {foto && <Image source={{ uri: urlFoto(foto) }} style={stili.foto} resizeMode="cover" />}

          <View style={stili.blocco}>
            <Text style={stili.prodotto}>{d.titolo ?? 'Offerta'}</Text>
            {sottotitolo ? <Text style={stili.dato}>{sottotitolo}</Text> : null}
          </View>

          {/* Il periodo del noleggio, in grande: e' la prima cosa che il
              cliente controlla. */}
          {periodo && (
            <View style={[stili.periodo, { backgroundColor: tinta.tenue }]}>
              <View style={stili.flex}>
                <Text style={[stili.etichetta, { color: tinta.forte }]}>RITIRO</Text>
                <Text style={stili.periodoGiorno}>{formattaGiorno(periodo.dal)}</Text>
              </View>
              <Text style={[stili.freccia, { color: tinta.forte }]}>→</Text>
              <View style={stili.flex}>
                <Text style={[stili.etichetta, { color: tinta.forte }]}>RICONSEGNA</Text>
                <Text style={stili.periodoGiorno}>{formattaGiorno(periodo.al)}</Text>
              </View>
              <View style={[stili.giorni, { backgroundColor: tinta.forte }]}>
                <Text style={stili.giorniNumero}>{periodo.giorni}</Text>
                <Text style={stili.giorniParola}>{periodo.giorni === 1 ? 'giorno' : 'giorni'}</Text>
              </View>
            </View>
          )}

          {dati.length > 0 && (
            <View style={stili.griglia}>
              {dati.map((x) => (
                <View key={x.etichetta} style={[stili.cella, { backgroundColor: tinta.tenue }]}>
                  <Text style={[stili.etichetta, { color: tinta.forte }]}>{x.etichetta.toUpperCase()}</Text>
                  <Text style={stili.cellaValore}>{x.valore}</Text>
                </View>
              ))}
            </View>
          )}

          {servizi.length > 0 && (
            <View style={stili.blocco}>
              <Text style={[stili.etichetta, { color: tinta.forte }]}>COMPRESO NEL CANONE</Text>
              <View style={stili.chips}>
                {servizi.map((s) => (
                  <Text key={s} style={[stili.chip, { backgroundColor: tinta.tenue, color: tinta.forte }]}>
                    ✓ {ETICHETTA_SERVIZIO[s]}
                  </Text>
                ))}
              </View>
              <Text style={stili.dato}>Non compreso: {NON_COMPRESO.join(', ').toLowerCase()}.</Text>
            </View>
          )}

          {comprese.length > 0 && (
            <View style={stili.blocco}>
              <Text style={[stili.etichetta, { color: tinta.forte }]}>COSA COPRE</Text>
              {comprese.map((g) => (
                <Text key={g.nome} style={stili.voceSi}>
                  ✓ {g.nome}
                  {g.dettaglio ? <Text style={stili.dato}> · {g.dettaglio}</Text> : null}
                </Text>
              ))}
            </View>
          )}
          {escluse.length > 0 && (
            <View style={stili.blocco}>
              <Text style={stili.etichetta}>COSA NON COPRE</Text>
              {escluse.map((g) => (
                <Text key={g.nome} style={stili.voceNo}>
                  ✕ {g.nome}
                </Text>
              ))}
            </View>
          )}

          <View style={stili.separatore} />

          <View style={stili.dueColonne}>
            <View style={stili.flex}>
              <Text style={stili.etichetta}>CLIENTE</Text>
              <Text style={stili.valore}>{d.cliente.nome}</Text>
              <Text style={stili.dato}>{pv.tipo_cliente === 'rivenditore' ? 'Rivenditore' : 'Privato'}</Text>
              {d.cliente.telefono ? <Text style={stili.dato}>{d.cliente.telefono}</Text> : null}
              {d.cliente.email ? <Text style={stili.dato}>{d.cliente.email}</Text> : null}
            </View>
            <View style={stili.flex}>
              <Text style={stili.etichetta}>PROPOSTO DA</Text>
              <Text style={stili.valore}>{d.venditore?.nome ?? ''}</Text>
              {d.venditore?.ragione_sociale ? <Text style={stili.dato}>{d.venditore.ragione_sociale}</Text> : null}
              {d.venditore?.piva_cf ? <Text style={stili.dato}>P. IVA / CF {d.venditore.piva_cf}</Text> : null}
              {d.venditore?.telefono ? <Text style={stili.dato}>{d.venditore.telefono}</Text> : null}
              {d.modulo === 'assicurazioni' && d.venditore?.rui ? (
                <Text style={stili.dato}>RUI n. {d.venditore.rui}</Text>
              ) : null}
            </View>
          </View>

          {/* Il totale nel colore del modulo: e' il numero del documento. */}
          <LinearGradient
            colors={gradienti[d.modulo] as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={stili.totale}
          >
            <View style={stili.flex}>
              <Text style={[stili.totaleVoce, { color: suGradiente[d.modulo] }]}>{VOCE_IMPORTO[d.modulo]}</Text>
              {periodo && periodo.giorni > 0 && (
                <Text style={[stili.totaleDettaglio, { color: suGradiente[d.modulo] }]}>
                  {periodo.giorni} {periodo.giorni === 1 ? 'giorno' : 'giorni'}
                  {/* Il conto solo se torna: se il venditore ha fatto un prezzo
                      diverso, "1 giorno × 50 €" accanto a 45 € confonde. */}
                  {periodo.totale_cent === pv.prezzo_cent ? ` × ${formattaEuro(periodo.tariffa_cent)}` : ''}
                </Text>
              )}
              {pv.formula && (
                <Text style={[stili.totaleDettaglio, { color: suGradiente[d.modulo] }]}>
                  {ETICHETTA_FORMULA[pv.formula]}
                </Text>
              )}
            </View>
            <Text style={[stili.totaleCifra, { color: suGradiente[d.modulo] }]}>{importo}</Text>
          </LinearGradient>

          {documenti.length > 0 && (
            <View style={stili.blocco}>
              <Text style={stili.etichetta}>DOCUMENTI GIÀ RACCOLTI</Text>
              {documenti.map((x) => (
                <Text key={x} style={stili.dato}>
                  ✓ {x}
                </Text>
              ))}
            </View>
          )}

          <View style={stili.blocco}>
            <Text style={stili.etichetta}>FIRMA DEL CLIENTE</Text>
            {pv.firma_tracciato ? (
              <>
                <Svg width="100%" height={80} viewBox={viewBoxFirma(pv.firma_tracciato)} preserveAspectRatio="xMinYMid meet">
                  <Path d={pv.firma_tracciato} stroke="#111827" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                {pv.firmato_il && <Text style={stili.dato}>Firmato il {dataLunga(pv.firmato_il)}</Text>}
              </>
            ) : (
              <View style={stili.lineaFirma} />
            )}
          </View>

          <Text style={stili.notaPiede}>
            Il presente preventivo non costituisce contratto. Gli importi possono variare in base alla
            disponibilità e ai dati definitivi.
          </Text>
        </View>
      </View>

      <View style={stili.azioni}>
        <Bottone
          testo={numeroCliente ? 'Manda su WhatsApp' : 'Condividi su WhatsApp'}
          icona="messaggio"
          onPress={() =>
            void Linking.openURL(
              `https://wa.me/${numeroCliente}?text=${encodeURIComponent(testoMessaggio)}`
            )
          }
        />
        {d.cliente.email && (
          <Bottone
            testo="Manda per email"
            icona="documento"
            tipo="tenue"
            onPress={() =>
              void Linking.openURL(
                `mailto:${d.cliente!.email}?subject=${encodeURIComponent(`Preventivo n. ${pv.numero}`)}&body=${encodeURIComponent(testoMessaggio)}`
              )
            }
          />
        )}
        {Platform.OS === 'web' && (
          <Bottone
            testo="Stampa o salva PDF"
            icona="documento"
            tipo="tenue"
            onPress={() => (globalThis as unknown as { print?: () => void }).print?.()}
          />
        )}
      </View>
    </ScrollView>
  );
}

const stili = stiliTema((c) =>
  StyleSheet.create({
    contenitore: { flex: 1, backgroundColor: c.sfondo },
    centrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.sfondo },
    contenuto: { padding: spazi.l, gap: spazi.l, paddingBottom: spazi.xxxl },
    piccolo: { ...testi.piccolo, color: c.testoTenue },
    flex: { flex: 1, gap: 2 },

    foglio: {
      backgroundColor: '#FFFFFF',
      borderRadius: raggio.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    testata: { padding: spazi.xl },
    testataRiga: { flexDirection: 'row', alignItems: 'center', gap: spazi.m },
    testataModulo: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, opacity: 0.85 },
    testataTitolo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    testataData: { fontSize: 13, fontWeight: '600', opacity: 0.85 },
    testataIcona: { borderRadius: raggio.l, overflow: 'hidden' },

    corpo: { padding: spazi.xl, gap: spazi.l },
    foto: { width: '100%', aspectRatio: 16 / 9, borderRadius: raggio.l, backgroundColor: '#F3F4F6' },
    blocco: { gap: 4 },
    prodotto: { fontSize: 20, fontWeight: '800', color: '#111827' },
    etichetta: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: '#6B7280' },
    valore: { fontSize: 15, fontWeight: '700', color: '#111827' },
    dato: { fontSize: 12, color: '#4B5563', lineHeight: 17 },

    periodo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spazi.s,
      borderRadius: raggio.l,
      padding: spazi.m,
    },
    periodoGiorno: { fontSize: 17, fontWeight: '800', color: '#111827' },
    freccia: { fontSize: 20, fontWeight: '800' },
    giorni: { alignItems: 'center', borderRadius: raggio.m, paddingVertical: spazi.s, paddingHorizontal: spazi.m },
    giorniNumero: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    giorniParola: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },

    griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.s },
    cella: { flexBasis: '48%', flexGrow: 1, borderRadius: raggio.m, padding: spazi.m, gap: 3 },
    cellaValore: { fontSize: 15, fontWeight: '700', color: '#111827' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spazi.xs, marginVertical: 2 },
    chip: {
      fontSize: 13,
      fontWeight: '700',
      borderRadius: raggio.tondo,
      paddingHorizontal: spazi.m,
      paddingVertical: 6,
      overflow: 'hidden',
    },
    voceSi: { fontSize: 14, fontWeight: '600', color: '#065F46' },
    voceNo: { fontSize: 14, color: '#9CA3AF' },

    separatore: { height: 1, backgroundColor: '#E5E7EB' },
    dueColonne: { flexDirection: 'row', gap: spazi.l },

    totale: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spazi.m,
      borderRadius: raggio.l,
      padding: spazi.l,
    },
    totaleVoce: { fontSize: 14, fontWeight: '800' },
    totaleDettaglio: { fontSize: 12, fontWeight: '600', opacity: 0.9 },
    totaleCifra: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },

    lineaFirma: { height: 44, borderBottomWidth: 1, borderBottomColor: '#9CA3AF' },
    notaPiede: { fontSize: 10, color: '#9CA3AF', lineHeight: 14 },

    azioni: { gap: spazi.s },
  })
);
