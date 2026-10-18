import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { isGarageThread, requestIdOf } from '../context/ChatContext';
import { QuoteSheet } from './QuoteSheet';
import { OfferSheet } from './OfferSheet';
import { DispatchSheet } from './DispatchSheet';
import type { CustomerRequest, IncomingRequest, ShopOrder } from '../types';

type Action = { key: string; icon: string; label: string; primary?: boolean; run: () => void };

/**
 * What the shop can do about a request or an order without leaving its chat: send a quote to a garage, answer a customer's enquiry,
 * confirm the stock, pack and send the order or have it ready at the counter. Each step also goes into the chat as a message.
 */
export const ChatJobActions: React.FC<{ threadId: string }> = ({ threadId }) => {
  const { requests, orders, newRequests, customerRequests, newCustomer, newWall, sales, confirmStock, declineStock, markReady, markSaleReady, dispatchSale, saleUnavailable } = useShop();
  const [quoting, setQuoting] = useState<IncomingRequest | null>(null);
  const [answering, setAnswering] = useState<CustomerRequest | null>(null);
  const [dispatching, setDispatching] = useState<ShopOrder | null>(null);
  const rid = requestIdOf(threadId);
  const actions: Action[] = [];

  if (isGarageThread(threadId)) {
    const r = requests.find((x) => x.id === rid);
    const order = orders.find((o) => o.quote.request.id === rid);
    if (r && !order && newRequests.some((x) => x.id === rid)) actions.push({ key: 'quote', icon: '💰', label: 'මිල', primary: true, run: () => setQuoting(r) });
    if (order?.status === 'confirming') {
      actions.push({ key: 'confirm', icon: '✅', label: 'තොගය', primary: true, run: () => confirmStock(order.id) });
      actions.push({ key: 'decline', icon: '✖', label: 'නැත', run: () => declineStock(order.id) });
    }
    if (order?.status === 'packing') {
      if (order.pickup) actions.push({ key: 'ready', icon: '📦', label: 'සූදානම්', primary: true, run: () => markReady(order.id) });
      else actions.push({ key: 'send', icon: '🛵', label: 'යවන්න', primary: true, run: () => setDispatching(order) });
    }
  } else {
    const cr = customerRequests.find((x) => x.id === rid);
    const sale = sales.find((s) => s.offer.request.id === rid);
    if (cr && !sale && [...newCustomer, ...newWall].some((x) => x.id === rid)) actions.push({ key: 'answer', icon: '💬', label: 'පිළිතුර', primary: true, run: () => setAnswering(cr) });
    if (sale?.stage === 'reserved') {
      if (sale.purchase.fulfilment === 'pickup') actions.push({ key: 'saleReady', icon: '📦', label: 'සූදානම්', primary: true, run: () => markSaleReady(sale.id) });
      else actions.push({ key: 'saleSend', icon: '🛵', label: 'යවන්න', primary: true, run: () => dispatchSale(sale.id, 'courier') });
      actions.push({ key: 'saleNone', icon: '✖', label: 'නැත', run: () => saleUnavailable(sale.id) });
    }
  }

  return (
    <View style={styles.wrap}>
      {actions.length > 0 && (
        <View style={styles.row}>
          {actions.map((a) => (
            <Pressable key={a.key} style={[styles.btn, a.primary && styles.primary]} onPress={a.run} accessibilityLabel={a.label}>
              <Text style={styles.icon}>{a.icon}</Text>
              <Text style={[styles.label, a.primary && styles.labelPrimary]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <QuoteSheet request={quoting} onClose={() => setQuoting(null)} />
      <OfferSheet request={answering} onClose={() => setAnswering(null)} />
      <DispatchSheet order={dispatching} onClose={() => setDispatching(null)} />
    </View>
  );
};

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    primary: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    icon: { fontSize: 15 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    labelPrimary: { color: BLUE() },
  })
);
