import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { txnId, type TxnKind } from '../utils/txn';

/** The transaction id of a record, as a small selectable tag (so it can be copied and quoted to a garage, shop or support). */
export const TxnTag: React.FC<{ kind: TxnKind; source: string }> = ({ kind, source }) => {
  const id = txnId(kind, source);
  return (
    <Text selectable style={styles.tag} accessibilityLabel={`Transaction ${id}`}>
      🧾 {id}
    </Text>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    tag: { alignSelf: 'flex-start', marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', fontSize: 10, fontFamily: FONTS.bodySemiBold, letterSpacing: 0.4, color: Colors.textMuted, backgroundColor: Colors.subtleFill },
  })
);
