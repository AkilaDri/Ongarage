# Ongarage — Sri Lanka Garage Seed List

Files:
- `Ongarage_Garages_SriLanka.xlsx` — open in LibreOffice. Sheet **Garages** = all garage rows; sheet **Summary** = counts per district.
- `Ongarage_Garages_SriLanka.csv` — same data as CSV (UTF-8 BOM) for app import in VS Code.

Columns: District, Name, Category, Address/Locality, Phone, Website, Latitude, Longitude, Google Maps link, Rating, Source, Source Link.

Method: merged from OpenStreetMap (Overpass API: garages/repair shops), Photon geocoder results, and the Rainbow Pages (SLT) directory geocoded with Nominatim. Districts assigned by actual OSM district boundaries (point-in-polygon).

Limits:
- Not every garage is online; some districts have fewer than 50 (see Summary "Shortfall"). Agreed target: at least 10 per district as a start.
- "Rating" is empty: Google review scores are not publicly scrapeable without the paid Google Maps Platform. Confirm "best-rated" garages manually during district-by-district enrollment.
- Some coordinates are town-level accurate; verify each on the Google Maps link before onboarding.
Generated 2026-11-10.
