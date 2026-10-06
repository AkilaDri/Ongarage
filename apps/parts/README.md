# OnGarage Parts: spare-parts shop app

The app parts shops use to answer garages' parts requests, fulfil orders and keep their stock current. It's the shop side of the garage app's **Parts** tab. It's part of the [OnGarage monorepo](../../README.md); setup, `.env` and run commands are there.

```bash
# from the repository root
npm run parts        # dev server
npm run parts:web    # in the browser
```

## Screens

| Tab | File | Purpose |
|---|---|---|
| Requests | `src/screens/RequestsScreen.tsx` | Garages' parts requests within the delivery radius, with stock on hand per line; quote or pass. Swipe a card for details (`RequestDetailSheet`: vehicle, chassis, old-part photo, map to the garage). Your quotes and their outcome |
| Orders | `src/screens/OrdersScreen.tsx` | Earnings; won quotes as orders: confirm stock → pack → dispatch (`DispatchSheet`: PickMe Flash or your own rider) → garage checks in and pays; returns |
| Stock | `src/screens/StockScreen.tsx` | Items by part type with price, brand and quantity; low / out-of-stock filter; edit or add (`StockEditSheet`) |
| Shop | `src/screens/ShopProfileScreen.tsx` | Ordered by daily use: delivery radius and delivery methods, reviews from garages (with replies), settings (what you sell, riders, how garages see you, theme) |

The header's pill opens or closes the shop. A closed shop gets no new requests.

## How it works

- **The contract** is the shared `PartsRequest` / `PartQuote` / `PartsOrder` in `packages/shared/src/types.ts`, the same types the garage app's `PartsContext` uses. `src/types.ts` holds the shop-side views (`IncomingRequest`, `MyQuote`, `ShopOrder`, `StockItem`).
- **Part type.** A shop may quote only the type the vehicle owner chose, limited to what it sells. Recon for a Genuine request appears only once the owner approved it (`allowedTypes` in `ShopContext`).
- **Quoting.** Prices pre-fill from stock, and the sheet picks the cheapest type it can fully supply. The garage compares *total* (parts + delivery) and whether it arrives before the job. Other shops' prices are never shown, only how many quoted.
- **Orders.** A chosen shop has 10 minutes to confirm stock. Saying "no stock", or letting the time run out, cancels the order and counts as a 1★ against the shop's rating, the same penalty the garage app applies. Confirming takes the parts out of stock, and an accepted return puts them back.
- **Money.** The garage pays on delivery. The shop keeps the parts total plus its own delivery fee; a courier's fee goes to the courier.

## Simulation

Everything lives in `src/context/ShopContext.tsx` until there is a backend. It simulates the garages:
- requests from four nearby garages, including TOPCODE (the garage app's garage), and one more about 45 seconds later;
- each quote is decided 15 seconds after it is sent: it wins when its total beats a hidden rival and arrives in time;
- deliveries take about 12 seconds, the garage then checks in and pays, and rates the order a few seconds later;
- one garage reports a wrong part, to exercise returns.

This shop is "Galle Auto Parts", the same shop the garage app simulates.

## Layout

```
src/
  app/          Expo Router entry (the layout renders App.tsx)
  App.tsx       Fonts, theme fade, header, tab bar
  components/   Header, toast + sheet wrappers, quote / dispatch / stock / catalogue / review sheets
  constants/    Mock shop, garages, requests, stock, reviews; tab icons
  context/      ShopContext: the shop's state and the simulated garages
  screens/      One file per tab
  types.ts      Shop-side views of the shared parts contract
  utils/        Formatting (re-exported from @ongarage/shared)
```
