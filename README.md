# Osservatorio, landing alternativa

Una landing più editoriale per osservatorio.rankwit.ai, con la pagina «Cosa è cambiato questo mese» e le pagine per categoria, regione e località. Online su https://generative-engine-optimization.github.io/osservatorio-mese/.

Sarà la nuova pagina dell'osservatorio: per questo le pagine non dicono più di essere una copia (niente riga sulla fonte, niente «sul sito» né «qui sono aperte a tutti»), e il piede è quello del sito («Un osservatorio di Rankwit…» con metodo, privacy, cookie, English). Le pagine hanno `noindex` finché stanno su github.io, così non fanno concorrenza al sito vero nei motori di ricerca.

**I numeri sono quelli pubblicati dall'osservatorio** (rilevazione del 1 novembre 2026, cioè ottobre su settembre), letti dalle pagine pubbliche di osservatorio.rankwit.ai. Niente viene ricalcolato: presenza, variazione, stabile o no, posizione e fonte più citata sono quelli del sito.

## Aprirlo

Dalla cartella `RankWit`:

```bash
python3 -m http.server 8767 --directory osservatorio-landing-alternativa
```

Poi http://localhost:8767. In Claude Code c'è la configurazione `osservatorio-alt` in `.claude/launch.json`.

## Aggiornare i dati

```bash
python3 build/importa-dal-sito.py --refresh
```

Scarica dal sito pubblico la sitemap, le 7 pagine di categoria, le 132 pagine categoria × regione, le 575 pagine delle località e i report di ogni rilevazione (in `build/.cache`, fuori da git, una pagina ogni 0,2 secondi), poi riscrive `js/data.js` e la cartella `data/`. Senza `--refresh` riusa le pagine già scaricate e ci mette pochi secondi. Le foto disponibili e i loro crediti stanno in `build/foto.json`.

Cosa prende dal sito:

- pagine di categoria: le regioni in ordine, presenza, ± sul mese prima, se il ± è oltre l'oscillazione (colorato sul sito) o stabile, posizione, fonte più citata con la sua quota; «su 100 fonti citate» con le altre fonti voce per voce; i siti di promozione turistica motore per motore; le domande con la ricerca Google dietro ognuna;
- pagine categoria × regione: le prime 15 località con il tipo di luogo, motore per motore (prime dieci), chi racconta il territorio, i siti di promozione motore per motore, in quante risposte compaiono siti di promozione, hotel, OTA e altre fonti, sito diretto contro OTA, le OTA più citate, le domande;
- pagine delle località: i primi dieci hotel, motore per motore, quante domande sugli hotel e quante ricerche, sito diretto contro OTA, le cinque fonti più citate, le domande;
- report di ogni rilevazione: quote per tipo di fonte con il ±, «su 100 fonti citate», le prime tre regioni per categoria con la fonte più citata.

`js/data.js` serve la landing e il numero del mese (circa 274 KB). Le pagine profonde leggono un file JSON ciascuna, in `data/`:

- `data/categorie/<categoria>.json` (7 file);
- `data/categorie/<categoria>/<regione>.json` (132);
- `data/categorie/<categoria>/<regione>/<località>.json` (575);
- `data/esplora.json`: tutte le categorie, le regioni e le località che hanno una pagina.

Il database dell'osservatorio sta su S3 e non serve: se un giorno lo si legge direttamente, cambia solo lo script.

## Pagine

- `index.html`: la landing. Ticker, il mese in breve, tre notizie in evidenza, «Da sapere» (quattro numeri del mese con la loro base, titolo sul mese di uscita), chi si muove con il perché probabile, classifiche delle regioni per categoria, regole di lettura, il riquadro che porta all'accesso con l'email sul sito dell'osservatorio.
- `mese.html?m=2026-10`: il numero del mese. Cinque notizie, tutti i movimenti con filtri e il numero di domande, nota su cosa diciamo e cosa no. Le rilevazioni di prima rimandano al loro report sul sito.
- `categoria.html?c=mare`: una categoria (mare, montagna, laghi, borghi, citta, neve, regione). Le regioni con ±, posizione e fonte più citata; chi racconta («su 100 fonti» e le altre fonti voce per voce); i siti di promozione turistica motore per motore; le domande con le ricerche Google.
- `regione.html?c=mare&r=puglia`: categoria × regione. Le prime 15 località con tipo, ± e posizione; motore per motore; chi racconta il territorio; quanto coprono i siti di promozione; sito diretto contro OTA; le domande. Le schede delle altre categorie della stessa regione.
- `localita.html?c=mare&r=puglia&l=monopoli`: una località. I primi dieci hotel, motore per motore, sito diretto contro OTA, le cinque fonti più citate, le domande.
- `esplora.html`: tutte le categorie, le regioni e le località, con una ricerca per nome.

Le quattro pagine profonde sono modelli: l'indirizzo dice quale pagina mostrare, `js/pagine.js` legge il suo file in `data/` e la disegna con i pezzi della landing (tabelle `rrow`, delta, frecce, foto con crediti). Ogni pagina ha le briciole di pane (Italia / Mare / Puglia / Monopoli), un indice delle sezioni e il link alla stessa pagina sul sito. Accanto a ogni classifica c'è la base: quante domande ci sono dietro.

Tutti i nomi di regioni e località nella landing, nel numero del mese, nel ticker, in «Chi si muove» e nelle notizie portano alle pagine interne. Una località senza pagina propria (hotel non misurati) apre la sua riga nella classifica della regione. Metodo, report, privacy, cookie, la versione inglese e le risposte per intero dell'AI restano link al sito originale.

Sul sito queste pagine si aprono dopo l'email (link magico); su github.io per ora sono aperte. Il blocco va fatto quando la pagina passa su osservatorio.rankwit.ai: vedi «Cosa manca».

## Le regole delle notizie

`js/core.js` sceglie le notizie dai dati, sempre con le stesse regole:

- **Cambia il primo**: la prima regione di una categoria cambia e la salita è oltre l'oscillazione (il primo di settembre viene dal report di settembre);
- **La salita e la discesa più grandi** oltre l'oscillazione;
- **La sorpresa**: la località che entra in classifica con la presenza più alta;
- **Cambia la fonte**: fra le prime tre regioni di ogni categoria, la fonte più citata cambia rispetto al mese prima (prima i siti di promozione turistica).

In «chi si muove» la i apre un perché probabile (`whyLines` in `js/core.js`), letto negli stessi numeri: chi si muove al contrario nella stessa classifica (almeno 3 punti), se sale o scende quasi tutta la classifica, quanto sono distanti gli assistenti, quante domande ci sono dietro. È un'ipotesi e la pagina lo dice.

Per le notizie, il ticker e «chi si muove» contano solo le classifiche con almeno quattro domande (`MIN_Q`): con una o due, una sola risposta sposta molti punti. Quei movimenti restano nella tabella del mese, con il numero di domande accanto.

## Cose da sapere sui dati del sito

- In 50 righe delle classifiche per regione il sito scrive «Hotel non misurati», ma la pagina con gli hotel esiste e ha i numeri (per esempio Polignano a Mare, Ostuni, Matera). Qui si segue la pagina: la località ha il link ai suoi hotel.
- Neve · Liguria non ha domande di confronto: la pagina lo dice e mostra solo le fonti. Il vecchio importatore lì leggeva la lista delle OTA come se fossero località (Tripadvisor compariva fra le località che scendono); ora non succede più, e nel mese le località che scendono sono una in meno.
- Le pagine delle località esistono solo per mare, montagna, laghi, borghi, città e neve. Nella regione in generale le località aprono la loro riga in classifica.

## Cosa manca

- Le risposte per intero dell'AI («Cosa risponde l'AI, per intero» sul sito): sono testi lunghi e restano sul sito, con un link da ogni pagina.
- Lo storico mese per mese delle località: le pagine pubbliche danno solo il mese corrente e il ± sul precedente. Con il database si possono rimettere i grafici di andamento.
- Le foto: ci sono per le notizie, per le località di «chi si muove» e per le schede «Da sapere» (Wikimedia Commons, crediti in `build/foto.json`, `pos` sposta il ritaglio, miniature in `img/t/` fatte con `sips -Z 240`). Quando i dati di un mese scelgono località nuove, servono foto nuove; senza foto la scheda usa il nome.
- La nota sui cambi di modello dei motori nel mese.
- L'accesso con l'email, come sul sito di oggi: il modulo manda a `POST api-v2.rankwit.ai/v2/osservatorio/access` (Turnstile, link valido 30 minuti), il link scrive il cookie `rw_osservatorio` su `.rankwit.ai` e il middleware di Cloudflare apre le pagine. L'API mette già ogni lettore in Attio (People e lista `osservatorio`, `api/src/modules/osservatorio/` nel monorepo). Brevo non c'è ancora. Da github.io non può funzionare (dominio del cookie e di Turnstile): per ora il riquadro porta a https://osservatorio.rankwit.ai/it/accesso.
- Quando questa pagina sostituisce il sito, `build/importa-dal-sito.py` non ha più niente da leggere: i numeri vanno presi dal database dell'osservatorio.
