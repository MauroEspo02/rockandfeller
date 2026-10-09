# Rock and Feller — sito

Link tree, menù, Componi tu, panino del mese, QR dinamici e pannello admin.
Gira su **Cloudflare Pages + D1**, come il portfolio.

## Pagine

| Indirizzo | Cosa c'è |
|---|---|
| `/` | Pagina iniziale (link tree): panino del mese, bottoni, social, orari |
| `/menu` | Il menù completo, scorrevole, con i colori del cartaceo |
| `/componi` | Componi tu: il panino si disegna mentre scegli, con il totale |
| `/del-mese` | Il panino del mese (ci porta il QR sul banco) |
| `/gratta` | Gratta e vinci: non è linkato da nessuna parte, si gioca solo arrivando dal QR "Gratta e vinci" |
| `/qr/<nome>` | Indirizzi fissi dei QR: contano la scansione e rimandano dove decidi |
| `/admin` | Pannello per te e il proprietario |

## Pubblicare su Cloudflare (una volta sola)

1. **Database.** Cloudflare → *Storage & Databases* → *D1* → *Create database*, nome `rockandfeller-db`.
   Copia il *Database ID* e incollalo in `wrangler.toml` al posto di `INCOLLA-QUI-IL-DATABASE-ID`.
   Le tabelle e il menù iniziale si creano da soli alla prima visita: non serve usare la console SQL.
2. **Repository.** Carica la cartella su GitHub (repo nuovo, es. `rockandfeller`), con tutte le sottocartelle.
3. **Progetto.** Cloudflare → *Workers & Pages* → *Create* → scheda **Pages** → *Connect to Git* → scegli il repo.
   - Framework preset: *None*
   - Build command: vuoto
   - Build output directory: `public`
4. **Password.** Nel progetto → *Settings* → *Variables and Secrets* → aggiungi due variabili di tipo **Secret**:
   - `ADMIN_PASSWORD`: password di emergenza (con utente `admin`)
   - `SESSION_SECRET`: una stringa lunga a caso (almeno 40 caratteri)
   Poi rifai il deploy (*Deployments* → *Retry deployment*).
5. **Dominio.** *Custom domains* → aggiungi il dominio del locale.
6. **Primo accesso.** Vai su `/admin`, entra con utente `admin` e la password di emergenza,
   e nella scheda *Altro* crea un account per te e uno per il proprietario. Da lì in poi usate quelli.

## Cose da sapere

- **QR**: stampali solo dopo aver collegato il dominio definitivo, scaricandoli dal pannello aperto da quel dominio.
  Il QR contiene `tuodominio/qr/<nome>`: la destinazione si cambia dal pannello e il QR stampato resta valido.
- **Panino del mese**: il QR "Panino del mese" porta a `/del-mese`. Ogni mese cambi il prodotto in *Del mese* e basta.
- **Gratta e vinci**: il QR "Gratta e vinci" (scheda QR del pannello) lascia al telefono un permesso di 2 ore per giocare.
  Chi apre `/gratta` senza passare dal QR vede solo "Si gioca nel locale". L'esito lo decide il server; chi vince riceve un codice
  tipo `RF-ABC234`. Alla cassa: pannello → *Gratta* → scrivi il codice → *Segna come usato*. Probabilità, vincite massime al giorno,
  giocate per telefono e validità si cambiano dalla stessa scheda. Il limite "una giocata al giorno" vale per telefono e browser:
  chi cancella i dati del browser può rigiocare, ma il tetto di vincite al giorno resta.
- **Parole arancioni** negli ingredienti: scrivile tra asterischi, es. `Porchetta *Selezione Letizia*`.
- **Esaurito**: dal pannello, bottone "Disp./Esaurito" accanto al prezzo. Nel menù appare barrato, nel Componi tu non si può scegliere.
- **Ingredienti nuovi nel Componi tu**: nel pannello scegli il "Disegno nel panino" (c'è l'anteprima). Per salse, formaggi e bibite scegli anche il colore.
- **Font**: ora c'è Alfa Slab One per i titoli e Poppins per il testo. Per mettere quello del brand:
  copia i file in `public/fonts/` e cambia i `@font-face` in cima a `public/css/base.css`.
- **Foto**: si caricano dal pannello e vengono rimpicciolite in automatico. Restano nel database D1.
- **Password dimenticata**: entra con `admin` + `ADMIN_PASSWORD` e cambiala dalla scheda *Altro*.

## Provare in locale (facoltativo)

Serve Node 22.5 o più recente, nient'altro:

```
node scripts/dev-server.mjs
```

Apri http://localhost:8788 (pannello: http://localhost:8788/admin, utente `admin`, password in `.dev.vars.example`).
Il database di prova finisce in `.local/` e si può cancellare per ripartire da zero.

## Struttura

```
public/            pagine, stili, script, font, logo
  admin/           pannello
  js/visuals.js    disegni del Componi tu
functions/         backend (Cloudflare Pages Functions)
  _lib/            database, accesso, controlli dei dati, menù iniziale (seed.js)
  api/             API pubbliche e del pannello
  qr/[slug].js     redirect dei QR con conteggio scansioni
  foto/[id].js     foto caricate dal pannello
scripts/           server di prova in locale e test
```
