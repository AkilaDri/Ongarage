// First sound of a Sinhala letter, in English letters (a name written in Sinhala still gets English initials).
const SINHALA: Record<string, string> = {
  අ: 'A', ආ: 'A', ඇ: 'A', ඈ: 'A', ඉ: 'I', ඊ: 'I', උ: 'U', ඌ: 'U', එ: 'E', ඒ: 'E', ඓ: 'A', ඔ: 'O', ඕ: 'O', ඖ: 'O',
  ක: 'K', ඛ: 'K', ග: 'G', ඝ: 'G', ඞ: 'N', ච: 'C', ඡ: 'C', ජ: 'J', ඣ: 'J', ඤ: 'N', ට: 'T', ඨ: 'T', ඩ: 'D', ඪ: 'D', ණ: 'N',
  ත: 'T', ථ: 'T', ද: 'D', ධ: 'D', න: 'N', ප: 'P', ඵ: 'P', බ: 'B', භ: 'B', ම: 'M', ය: 'Y', ර: 'R', ල: 'L', ව: 'V',
  ශ: 'S', ෂ: 'S', ස: 'S', හ: 'H', ළ: 'L', ෆ: 'F', ඳ: 'D', ඹ: 'B',
};

/** Up to two English capital letters for a name, such as "RP" for රොෂාන් පෙරේරා or "AP" for Auto Parts. */
export const initialsOf = (name: string): string => {
  const letters: string[] = [];
  for (const word of name.trim().split(/\s+/)) {
    for (const ch of Array.from(word)) {
      const l = /[A-Za-z]/.test(ch) ? ch.toUpperCase() : SINHALA[ch];
      if (l) {
        letters.push(l);
        break;
      }
    }
    if (letters.length === 2) break;
  }
  return letters.join('') || '•';
};
