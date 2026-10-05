import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ETICHETTA_FORMULA,
  ETICHETTA_MODULO,
  formattaEuro,
  tab,
  type FormulaAcquisto,
  type Modulo,
  type TipoCliente,
} from '@lab/shared';

import { Bottone } from '@/components/modulo';
import { Testo as Text } from '@/components/testo';
import { supabase } from '@/lib/supabase';
import { colori, raggio, spazi, stiliTema, testi } from '@/lib/tema';

interface RigaPreventivo {
  numero: number;
  pratica_id: string;
  formula: FormulaAcquisto | null;
  tipo_cliente: TipoCliente;
  prezzo_cent: number;
  firma_tracciato: string | null;
  firmato_il: string | null;
  created_at: string;
  doc_identita: boolean;
  doc_reddito: boolean;
  doc_passaggio: boolean;
}

interface RigaPratica {
  cliente_nome: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  offerta_titolo: string | null;
  modulo: Modulo;
}

interface RigaVenditore {
  nome_visualizzato: string;
  ragione_sociale: string | null;
  piva_cf: string | null;
  telefono: string | null;
  email_pubblica: string | null;
  rui_numero: string | null;
}

/** Cosa rappresenta l'importo, secondo il modulo. */
const VOCE_IMPORTO: Record<Modulo, string> = {
  vendita: 'Prezzo',
  noleggio_breve: 'Totale noleggio',
  noleggio_lungo: 'Canone mensile',
  assicurazioni: 'Premio',
};

function data(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * La firma salvata e' un tracciato in pixel del riquadro in cui e' stata
 * fatta, che cambia da telefono a telefono: per ridisegnarla si calcola
 * l'ingombro dai punti stessi e lo si usa come viewBox.
 */
function viewBoxFirma(tracciato: string): string {
  const numeri = (tracciato.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = numeri.filter((_, i) => i % 2 === 0);
  const ys = numeri.filter((_, i) => i % 2 === 1);
  if (xs.length === 0) return '0 0 100 40';
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const margine = 8;
  return `${x0 - margine} ${y0 - margine} ${x1 - x0 + margine * 2} ${y1 - y0 + margine * 2}`;
}

/**
 * Il preventivo come documento: si apre dalla pratica, si manda al cliente su
 * WhatsApp o si stampa (dal browser anche in PDF).
 */
export default function DocumentoPreventivo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pv, setPv] = useState<RigaPreventivo | null>(null);
  const [pratica, setPratica] = useState<RigaPratica | null>(null);
  const [venditore, setVenditore] = useState<RigaVenditore | null>(null);
  const [caricato, setCaricato] = useState(false);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [p, v] = await Promise.all([
        supabase
          .from(tab('preventivo'))
          .select(
            'numero, pratica_id, formula, tipo_cliente, prezzo_cent, firma_tracciato, firmato_il, created_at, doc_identita, doc_reddito, doc_passaggio'
          )
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from(tab('venditore'))
          .select('nome_visualizzato, ragione_sociale, piva_cf, telefono, email_pubblica, rui_numero')
          .maybeSingle(),
      ]);
      const riga = (p.data as RigaPreventivo | null) ?? null;
      let prat: RigaPratica | null = null;
      if (riga) {
        const r = await supabase
          .from(tab('pratica_elenco'))
          .select('cliente_nome, cliente_telefono, cliente_email, offerta_titolo, modulo')
          .eq('id', riga.pratica_id)
          .maybeSingle();
        prat = (r.data as RigaPratica | null) ?? null;
      }
      if (!vivo) return;
      setPv(riga);
      setPratica(prat);
      setVenditore((v.data as RigaVenditore | null) ?? null);
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

  if (!pv || !pratica) {
    return (
      <View style={stili.centrato}>
        <Text style={stili.piccolo}>Preventivo non trovato.</Text>
      </View>
    );
  }

  const voce = VOCE_IMPORTO[pratica.modulo];
  const importo = `${formattaEuro(pv.prezzo_cent)}${pratica.modulo === 'noleggio_lungo' ? ' al mese' : ''}`;

  const testoWhatsApp = [
    `Ciao ${pratica.cliente_nome.split(' ')[0]}, ecco il preventivo n. ${pv.numero} del ${data(pv.created_at)}.`,
    pratica.offerta_titolo ? `${ETICHETTA_MODULO[pratica.modulo]}: ${pratica.offerta_titolo}` : null,
    `${voce}: ${importo}`,
    pv.formula ? `Pagamento: ${ETICHETTA_FORMULA[pv.formula]}` : null,
    venditore ? `\n${venditore.nome_visualizzato}${venditore.telefono ? ` · ${venditore.telefono}` : ''}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const numeroCliente = (pratica.cliente_telefono ?? '').replace(/[^\d]/g, '');

  function inviaWhatsApp() {
    const base = numeroCliente ? `https://wa.me/${numeroCliente}` : 'https://wa.me/';
    void Linking.openURL(`${base}?text=${encodeURIComponent(testoWhatsApp)}`);
  }

  function inviaEmail() {
    const oggetto = `Preventivo n. ${pv!.numero}`;
    void Linking.openURL(
      `mailto:${pratica!.cliente_email ?? ''}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testoWhatsApp)}`
    );
  }

  const documenti = [
    pv.doc_identita && 'Carta d’identità e codice fiscale',
    pv.doc_reddito && 'Documento di reddito',
    pv.doc_passaggio && 'Passaggio di proprietà',
  ].filter(Boolean) as string[];

  return (
    <ScrollView style={stili.contenitore} contentContainerStyle={stili.contenuto}>
      <Stack.Screen options={{ title: `Preventivo n. ${pv.numero}` }} />

      {/* Il foglio: chiaro anche col tema scuro, perche' e' un documento da
          mostrare e stampare, non una schermata dell'app. */}
      <View style={stili.foglio}>
        <View style={stili.intestazione}>
          <View style={stili.flex}>
            <Text style={stili.venditore}>{venditore?.nome_visualizzato ?? ''}</Text>
            {venditore?.ragione_sociale ? <Text style={stili.datoVenditore}>{venditore.ragione_sociale}</Text> : null}
            {venditore?.piva_cf ? <Text style={stili.datoVenditore}>P. IVA / CF {venditore.piva_cf}</Text> : null}
            {venditore?.telefono ? <Text style={stili.datoVenditore}>{venditore.telefono}</Text> : null}
            {venditore?.email_pubblica ? <Text style={stili.datoVenditore}>{venditore.email_pubblica}</Text> : null}
            {pratica.modulo === 'assicurazioni' && venditore?.rui_numero ? (
              <Text style={stili.datoVenditore}>Iscrizione RUI n. {venditore.rui_numero}</Text>
            ) : null}
          </View>
          <View style={stili.numeroBox}>
            <Text style={stili.etichetta}>PREVENTIVO</Text>
            <Text style={stili.numero}>n. {pv.numero}</Text>
            <Text style={stili.datoVenditore}>{data(pv.created_at)}</Text>
          </View>
        </View>

        <View style={stili.blocco}>
          <Text style={stili.etichetta}>CLIENTE</Text>
          <Text style={stili.valore}>{pratica.cliente_nome}</Text>
          <Text style={stili.datoVenditore}>
            {pv.tipo_cliente === 'rivenditore' ? 'Rivenditore' : 'Privato'}
            {pratica.cliente_telefono ? ` · ${pratica.cliente_telefono}` : ''}
            {pratica.cliente_email ? ` · ${pratica.cliente_email}` : ''}
          </Text>
        </View>

        <View style={stili.blocco}>
          <Text style={stili.etichetta}>{ETICHETTA_MODULO[pratica.modulo].toUpperCase()}</Text>
          <Text style={stili.valore}>{pratica.offerta_titolo ?? 'Offerta rimossa'}</Text>
          {pv.formula && <Text style={stili.datoVenditore}>Pagamento: {ETICHETTA_FORMULA[pv.formula]}</Text>}
        </View>

        <View style={stili.totale}>
          <Text style={stili.totaleVoce}>{voce}</Text>
          <Text style={stili.totaleCifra}>{importo}</Text>
        </View>

        {documenti.length > 0 && (
          <View style={stili.blocco}>
            <Text style={stili.etichetta}>DOCUMENTI GIÀ RACCOLTI</Text>
            {documenti.map((d) => (
              <Text key={d} style={stili.datoVenditore}>
                ✓ {d}
              </Text>
            ))}
          </View>
        )}

        <View style={stili.blocco}>
          <Text style={stili.etichetta}>FIRMA DEL CLIENTE</Text>
          {pv.firma_tracciato ? (
            <>
              <Svg width="100%" height={90} viewBox={viewBoxFirma(pv.firma_tracciato)} preserveAspectRatio="xMinYMid meet">
                <Path d={pv.firma_tracciato} stroke="#111827" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              {pv.firmato_il && <Text style={stili.datoVenditore}>Firmato il {data(pv.firmato_il)}</Text>}
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

      <View style={stili.azioni}>
        <Bottone testo={numeroCliente ? 'Manda su WhatsApp' : 'Condividi su WhatsApp'} icona="messaggio" onPress={inviaWhatsApp} />
        {pratica.cliente_email && <Bottone testo="Manda per email" icona="documento" tipo="tenue" onPress={inviaEmail} />}
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
      borderRadius: raggio.l,
      padding: spazi.xl,
      gap: spazi.l,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    intestazione: {
      flexDirection: 'row',
      gap: spazi.m,
      paddingBottom: spazi.l,
      borderBottomWidth: 2,
      borderBottomColor: '#111827',
    },
    venditore: { fontSize: 18, fontWeight: '800', color: '#111827' },
    datoVenditore: { fontSize: 12, color: '#4B5563', lineHeight: 17 },
    numeroBox: { alignItems: 'flex-end', gap: 2 },
    numero: { fontSize: 22, fontWeight: '800', color: '#111827' },
    etichetta: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: '#6B7280' },
    blocco: { gap: 3 },
    valore: { fontSize: 16, fontWeight: '700', color: '#111827' },
    totale: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      backgroundColor: '#F3F4F6',
      borderRadius: raggio.m,
      padding: spazi.l,
    },
    totaleVoce: { fontSize: 14, fontWeight: '600', color: '#374151' },
    totaleCifra: { fontSize: 26, fontWeight: '800', color: '#111827' },
    lineaFirma: { height: 48, borderBottomWidth: 1, borderBottomColor: '#9CA3AF' },
    notaPiede: { fontSize: 10, color: '#9CA3AF', lineHeight: 14 },

    azioni: { gap: spazi.s },
  })
);
