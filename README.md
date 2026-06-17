# BBOX – Szervezeti hierarchia

## Megnyitás (így NEM lesz hiba)

Dupla kattintás az **`index.html`** fájlra — **nem kell** Python szerver.

A chart és a nevek közvetlenül az HTML-ben vannak (mint az eredeti verzióban).

## Fájlok

| Fájl | Szerep |
|------|--------|
| `index.html` | Struktúra + összes munkatárs |
| `script.js` | Vonalak, keresés, modal, prezentációs mód |
| `styles.css` | Modern kinézet |
| `letöltés.jpg` | Logó (opcionális) |

Az `org-data.json` **nem használt** — csak régi próba, törölhető.

## Használat

- **Üres területen** húzás = lap mozgatása.
- **Kártya húzása** = másik részleg oszlopába.
- **+ Új munkatárs** = felvétel (név, beosztás, részleg, próbaidő).
- **Kártyára kattintás** = részletek, szerkesztés, próbaidő lejárt, kilépés/törlés.
- **Mentés** / automatikus mentés: böngésző `localStorage` (elrendezés + személyek).
- **Eredeti visszaállítás**: induló lista és elrendezés, mentés törlése.
- **Prezentációs mód**: csak nézet (nincs szerkesztés).
- Ügyvezető és ágvezetők: fix, nem törölhetők.
- **PDF / nyomtatás**: böngészőben „Mentés PDF-ként”.
- **Webes megtekintés**: futtasd a `server.js`-t és nyisd meg a `http://localhost:8080/` címet.

## Szerkesztés

Új személy: másolj egy `<div class="node">…</div>` blokkot a megfelelő oszlopban az `index.html`-ben.

Próbaidős: add hozzá a `probation` osztályt.
