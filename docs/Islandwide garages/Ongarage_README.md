# Ongarage — Sri Lanka Garage Seed List

Files:
- `Ongarage_Garages_SriLanka.xlsx` — open in LibreOffice. Sheet **Garages** = all garage rows; sheet **Summary** = counts per district.
- `Ongarage_Garages_SriLanka.csv` — same data as CSV (UTF-8 BOM) for app import in VS Code.

Columns: District, Name, Type, Category, Address/Locality, Phone, Website, Latitude, Longitude, Google Maps link, Main Services (collected), Rating, Source, Source Link.

"Type" classifies every row into: Garage, Tyre Service Center, General Service Center, Vehicle Modification Shop, Spare Parts Shop, Towing Service — from the row's source category and name keywords. "Category" keeps the finer original label (e.g. Motorcycle Repair, Vehicle Service Station).

Coverage per district is all listings found, not a fixed target: garages/tyre/motorcycle repair from OpenStreetMap, spare parts shops from OSM `shop=car_parts`, towing/breakdown-wrecker, spare-parts and service-station listings from the SLT Rainbow Pages directory, geocoded with Nominatim.

"Main Services (collected)" is filled from what each garage actually publishes: OpenStreetMap service tags (`service:vehicle:*`, operator, brand, description, opening hours) where present; otherwise the source category's typical scope (e.g. "Vehicle repair & maintenance (category)") or "Service details not published". These are NOT scraped from Google My Business — per-garage GMB detail is not reachable without the paid Google Maps Platform; enter real service menus during enrollment.

Phone numbers: partly from OpenStreetMap, partly cross-matched from the SLT Rainbow Pages directory by normalized garage name + town/address overlap (conservative match to avoid wrong numbers for common names). Verify numbers when calling for onboarding.

Method: merged from OpenStreetMap (Overpass API: garages/repair shops), Photon geocoder results, and the Rainbow Pages (SLT) directory geocoded with Nominatim. Districts assigned by actual OSM district boundaries (point-in-polygon).

Limits:
- Counts are everything publicly listed per district — not a fixed 50 target (agreed earlier: 10+ per district is a valid seed).
- "Rating" is empty: Google review scores are not publicly scrapeable without the paid Google Maps Platform. Confirm "best-rated" garages manually during district-by-district enrollment.
- Some coordinates are town-level accurate; verify each on the Google Maps link before onboarding.
Generated 2026-11-10.

## Update: types, towing, spare parts
- New "Type" column: Garage, Tyre Service Center, General Service Center, Vehicle Modification Shop, Spare Parts Shop, Towing Service. Workbook has one sheet per type plus a Summary (district x type).
- Added 697 rows from OpenStreetMap (per-district boundaries), deduplicated by name + coordinates. Everything has latitude/longitude.
- Type is assigned from OSM tags first, then name keywords; some mislabels are possible.
- Towing (107) and Modification (7) are thin: OSM has few tagged; field team should add more. No Google ratings/GMB (paid API needed).
