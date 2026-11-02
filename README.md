# Osservatorio, landing alternativa (prototipo)

Prototipo cliccabile di una landing più editoriale per osservatorio.rankwit.ai, con la pagina «Cosa è cambiato questo mese». 26 ottobre 2026.

**Tutti i numeri sono dati di esempio.** Lo dicono la fascia in alto, il bollino fisso, la prima voce del ticker e il piè di pagina.

## Aprirlo

Dalla cartella `RankWit`:

```bash
python3 -m http.server 8767 --directory osservatorio-landing-alternativa
```

Poi http://localhost:8767. In Claude Code c'è la configurazione `osservatorio-alt` in `.claude/launch.json`.

## Pagine

- `index.html`: la landing. Ticker in stile borsa, quadro del mese (salgono, stabili, scendono), tre schede con foto (salita, discesa, sorpresa), chi si muove, classifiche delle regioni per categoria con posizione e andamento, archivio dei numeri, regole di lettura, iscrizione (finta).
- `mese.html?m=2026-10`: il numero del mese. Cinque notizie, tutti i movimenti con filtri, nota su cosa diciamo e cosa no, numero precedente e successivo. Funziona anche per `2026-08` e `2026-09`, dove al posto di «Da guardare» c'è «Com'è andata dopo».

## Come sono fatti i numeri

- `build/gen-data.mjs` scrive `js/data.js`. È deterministico: stesso seme, stessi numeri. Le serie delle località delle notizie sono scritte a mano (`OVERRIDES`), le altre vengono da una passeggiata casuale. Il generatore cambia seme finché nessun'altra località ruba le notizie scelte.
- `js/core.js` calcola tutto il resto dai dati: variazioni, stabili, posizioni, notizie del mese e testi. I testi sono modelli riempiti con i numeri, così non possono dire una cosa diversa dalla tabella.
- Le regole sono quelle del metodo pubblico: variazione in punti, «stabile» se resta dentro l'oscillazione dello stesso mese (niente verde né rosso), freccia per le posizioni, pallino per chi entra.

Le cinque notizie, sempre le stesse: salita più grande oltre l'oscillazione, discesa più grande, località che entra con la presenza più alta, primo cambio al primo posto, primo cambio di fonte più citata.

## Foto

Dodici foto da Wikimedia Commons, con autore e licenza nei crediti di ogni pagina. Le licenze CC BY-SA chiedono il credito e la stessa licenza per le versioni modificate: qui sono solo ritagliate.

## Prima di andare in produzione

- Collegare i dati veri: per ogni località serve la presenza mese per mese, l'oscillazione misurata nello stesso mese e la base di risposte. Oggi l'oscillazione è stimata.
- Verificare sui dati veri quante variazioni superano l'oscillazione. Se sono pochissime, il ticker va riempito con le regioni e con le stabili.
- Decidere da dove vengono le foto per le località in evidenza (Commons, DMO, archivio nostro).
- Scrivere la nota sui cambi di modello del mese, oggi è un segnaposto.
- Iscrizione al bollettino: il modulo non invia niente.
