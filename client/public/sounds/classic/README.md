# Classic Monopoly Sounds

Place audio files in this directory. Each event needs two codec variants:

- `.webm` (WebM/Opus) — preferred, smaller, used on Chrome/Firefox/Edge
- `.mp3` — fallback for iOS Safari

## Required files

| Filename (no extension) | Event                         | Sound description                    |
| ----------------------- | ----------------------------- | ------------------------------------ |
| `your-turn`             | Your turn starts              | Rising 3-note bell chime             |
| `opponent-turn`         | Other player's turn           | Soft single tick                     |
| `dice-roll`             | Dice rolled                   | Physical dice rattling and landing   |
| `token-move`            | Player token moves            | Light tap (short, plays per space)   |
| `pass-go`               | Player passes GO              | Bright fanfare + cash register       |
| `land-brown`            | Land on Brown property        | Earthy thud, low                     |
| `land-light-blue`       | Land on Light Blue            | Gentle water/crystal sound           |
| `land-pink`             | Land on Pink (Magenta)        | Playful boing/bubble pop             |
| `land-orange`           | Land on Orange                | Warm wooden knock                    |
| `land-red`              | Land on Red                   | Sharp dramatic impact sting          |
| `land-yellow`           | Land on Yellow                | Bright shimmering chime              |
| `land-green`            | Land on Green                 | Deep resonant success tone           |
| `land-dark-blue`        | Land on Dark Blue             | Rich orchestral hit                  |
| `land-railroad`         | Land on Railroad              | Steam whistle + train chug           |
| `land-utility`          | Land on Utility               | Electric hum OR water splash         |
| `land-tax`              | Land on Tax space             | Cash register opening reluctantly    |
| `land-chance`           | Draw Chance card              | Card shuffle/flip + suspense         |
| `land-community-chest`  | Draw Community Chest          | Card shuffle + warm whoosh           |
| `land-free-parking`     | Land on Free Parking          | Gentle relief chord                  |
| `land-go`               | Land on GO corner             | Cash register ding                   |
| `buy-property`          | Buy a property                | Paper + stamp sound                  |
| `pay-rent`              | Pay rent to another player    | Coins draining out, slightly sad     |
| `collect-rent`          | Collect rent from player      | Satisfying "cha-ching" + jingle      |
| `build-house`           | Build a house                 | Hollow wooden tap                    |
| `build-hotel`           | Build a hotel                 | Construction + triumphant flourish   |
| `sell-building`         | Sell a building               | Reverse tap, deflating               |
| `mortgage`              | Mortgage a property           | Heavy thud + cash register           |
| `unmortgage`            | Unmortgage a property         | Paper rustle + positive chord        |
| `card-draw`             | Card drawn (Chance/Community) | Crisp card flip                      |
| `auction-start`         | Auction begins                | Gavel strike on block                |
| `auction-bid`           | Bid placed in auction         | Quick satisfying click               |
| `auction-win`           | Auction ends with winner      | Victory sting + gavel slam           |
| `go-to-jail`            | Player sent to jail           | Trombone slide down + cell clang     |
| `get-out-of-jail`       | Player leaves jail            | Key + creak + ascending chord        |
| `trade-complete`        | Trade accepted                | Handshake foley + satisfaction chime |
| `tax-paid`              | Tax paid to bank              | Coins clinking                       |
| `bankruptcy`            | Player goes bankrupt          | Sad trombone "wah wah waaah"         |
| `victory`               | Game won                      | Full triumphant brass fanfare        |

## Recommended sources

- **Freesound.org** (CC0 filter) — free, high quality
- **Kenney.nl** (Casino + UI packs) — free CC0, instant download
- **Zapsplat.com** — paid ($15/mo removes attribution)
- **jsfxr.com** — browser-based 8-bit sound generator, free

## Conversion commands

```bash
# Single file: WAV → WebM + MP3
ffmpeg -i input.wav -c:a libopus -b:a 96k output.webm
ffmpeg -i input.wav -c:a libmp3lame -q:a 4 output.mp3

# Batch convert all WAVs in a folder
for f in raw/*.wav; do
  base=$(basename "$f" .wav)
  ffmpeg -i "$f" -c:a libopus -b:a 96k "${base}.webm"
  ffmpeg -i "$f" -c:a libmp3lame -q:a 4 "${base}.mp3"
done
```

## Spriting (production optimization)

Bundle all files into one sprite to minimize mobile HTTP requests:

```bash
npx audiosprite \
  --output sprite \
  --format howle2 \
  --export ogg,mp3 \
  *.mp3
```

This generates `sprite.webm`, `sprite.mp3`, and `sprite.json`.
Copy the sprite values from the JSON into `classicSpriteTheme.spriteMap` in
`src/sounds/themes/classic/index.ts`.
