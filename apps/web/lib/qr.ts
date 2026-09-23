import QRCode from 'qrcode';

/**
 * QR come SVG generato sul server: nessuno script nel browser, si stampa
 * nitido a qualsiasi dimensione e non dipende da un servizio esterno.
 */
export function qrSvg(testo: string): Promise<string> {
  return QRCode.toString(testo, {
    type: 'svg',
    margin: 0,
    // Livello M: regge una stampa un po' sporca o un adesivo rovinato,
    // senza far diventare il disegno troppo fitto.
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#00000000' },
  });
}
