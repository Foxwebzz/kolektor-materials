import { jsPDF } from 'jspdf';

let fontsLoaded = false;
let regularBase64 = '';
let boldBase64 = '';

async function loadFontBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function registerFonts(doc: jsPDF): Promise<void> {
  if (!fontsLoaded) {
    regularBase64 = await loadFontBase64('assets/fonts/Roboto-Regular.ttf');
    boldBase64 = await loadFontBase64('assets/fonts/Roboto-Bold.ttf');
    fontsLoaded = true;
  }

  doc.addFileToVFS('Roboto-Regular.ttf', regularBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  doc.setFont('Roboto', 'normal');
}
