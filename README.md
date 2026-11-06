# Osservatorio, landing alternativa (prototipo)

Prototipo cliccabile di una landing più editoriale per osservatorio.rankwit.ai, con la pagina «Cosa è cambiato questo mese». Online su https://generative-engine-optimization.github.io/osservatorio-mese/.

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

Scarica dal sito pubblico la sitemap, le 7 pagine di categoria, le pagine delle regioni e i report di ogni rilevazione (in `build/.cache`, fuori da git) e riscrive `js/data.js`. Senza `--refresh` riusa le pagine già scaricate. Le foto disponibili e i loro crediti stanno in `build/foto.json`.

Cosa prende dal sito:

- pagine di categoria: le regioni in ordine, presenza, ± sul mese prima, se il ± è oltre l'oscillazione (colorato sul sito) o stabile, posizione, fonte più citata con la sua quota;
- pagine delle regioni: le prime 15 località, gli stessi numeri, il tipo di luogo, quante domande ci sono dietro, motore per motore (prime dieci);
- report di ogni rilevazione: quote per tipo di fonte con il ±, «su 100 fonti citate», le prime tre regioni per categoria con la fonte più citata.

Il database dell'osservatorio sta su S3 e non serve: se un giorno lo si legge direttamente, cambia solo lo script.

## Pagine

- `index.html`: la landing. Ticker, il mese in breve, tre notizie in evidenza, «Da sapere» (quattro numeri del mese con la loro base), chi si muove, classifiche delle regioni per categoria, archivio delle rilevazioni, regole di lettura, iscrizione (finta).
- `mese.html?m=2026-10`: il numero del mese. Cinque notizie, tutti i movimenti con filtri e il numero di domande, nota su cosa diciamo e cosa no. Le rilevazioni di prima rimandano al loro report sul sito.

## Le regole delle notizie

`js/core.js` sceglie le notizie dai dati, sempre con le stesse regole:

- **Cambia il primo**: la prima regione di una categoria cambia e la salita è oltre l'oscillazione (il primo di settembre viene dal report di settembre);
- **La salita e la discesa più grandi** oltre l'oscillazione;
- **La sorpresa**: la località che entra in classifica con la presenza più alta;
- **Cambia la fonte**: fra le prime tre regioni di ogni categoria, la fonte più citata cambia rispetto al mese prima (prima i siti di promozione turistica).

Per le notizie, il ticker e «chi si muove» contano solo le classifiche con almeno quattro domande (`MIN_Q`): con una o due, una sola risposta sposta molti punti. Quei movimenti restano nella tabella del mese, con il numero di domande accanto.

## Cosa manca

- Lo storico mese per mese delle località: le pagine pubbliche danno solo il mese corrente e il ± sul precedente. Con il database si possono rimettere i grafici di andamento.
- Le foto delle località in evidenza: oggi ci sono solo per Civita di Bagnoregio (borghi del Lazio); le altre schede usano il nome.
- La nota sui cambi di modello dei motori nel mese.
- Iscrizione al bollettino: il modulo non invia niente.
