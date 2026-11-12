import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { billHtml, billText, type BillDocument } from '../marketplace/billDocument';

/**
 * Makes the bill a PDF and hands it to the share sheet (on a phone), or opens the browser's print dialog, where "Save as PDF" makes the file (on the
 * web). When a PDF can't be made it shares the bill as text. Returns how it went, so the screen can tell the user.
 */
export const shareBill = async (doc: BillDocument): Promise<'pdf' | 'print' | 'text'> => {
  const html = billHtml(doc);
  if (Platform.OS === 'web') {
    const w = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    if (!w) return 'text';
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
    return 'print';
  }
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `බිල්පත ${doc.number}`, UTI: 'com.adobe.pdf' });
      return 'pdf';
    }
  } catch {
    // fall through to the text bill
  }
  await Share.share({ title: `බිල්පත ${doc.number}`, message: billText(doc) });
  return 'text';
};
