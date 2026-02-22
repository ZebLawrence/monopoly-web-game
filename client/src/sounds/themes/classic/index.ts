import type { SoundTheme } from '../../types';
import { SoundEvent } from '../../types';

/**
 * Classic Monopoly sound theme.
 *
 * HOW TO ADD SOUNDS
 * -----------------
 * 1. Source audio files (see docs/sounds.md for recommended sites)
 * 2. Convert to WebM + MP3:
 *      ffmpeg -i input.wav -c:a libopus -b:a 96k output.webm
 *      ffmpeg -i input.wav -c:a libmp3lame -q:a 4 output.mp3
 * 3. Place files in: client/public/sounds/classic/<name>.[webm|mp3]
 * 4. The arrays below list [preferred, fallback] — Howler picks automatically.
 *
 * FILE NAMING CONVENTION
 * ----------------------
 * Each key below maps to: /sounds/classic/<event-name>.[webm|mp3]
 * Example: SoundEvent.DiceRoll → /sounds/classic/dice-roll.webm
 *
 * SPRITE ALTERNATIVE
 * ------------------
 * For production, bundle everything into one sprite file to minimize
 * HTTP requests (especially important on mobile):
 *   npx audiosprite --output public/sounds/classic/sprite --format howle2 public/sounds/classic/*.mp3
 * Then use the sprite-based theme export at the bottom of this file.
 */

// Helper to generate both codec variants from a base path
function s(base: string): [string, string] {
  return [`/sounds/classic/${base}.webm`, `/sounds/classic/${base}.mp3`];
}

export const classicTheme: SoundTheme = {
  id: 'classic',
  name: 'Classic Monopoly',
  masterVolume: 0.8,

  files: {
    // ── Turn flow ─────────────────────────────────────────────────────────
    // Warm three-note ascending bell chime — signals it's YOUR turn
    [SoundEvent.YourTurn]: s('YourTurn'),
    // Soft single tick — lets others know the game advanced
    [SoundEvent.OpponentTurn]: s('OpponentTurn'),

    // ── Dice ──────────────────────────────────────────────────────────────
    // Physical dice rattling then landing on a hard surface
    [SoundEvent.DiceRoll]: s('DiceRoll'),

    // ── Movement ──────────────────────────────────────────────────────────
    // Light tapping for each space moved (short, repeating)
    [SoundEvent.TokenMove]: s('TokenMove'),
    // Bright ascending fanfare + cash register — passing GO
    [SoundEvent.PassGo]: s('PassGo'),

    // ── Landing by color group ────────────────────────────────────────────
    // Brown: earthy thud, low and cheap-feeling
    [SoundEvent.LandBrown]: s('LandProperty'),
    // Light Blue: gentle splashing water sound, light and airy
    [SoundEvent.LandLightBlue]: s('LandProperty'),
    // Pink/Magenta: playful boing/bubble pop
    [SoundEvent.LandPink]: s('LandProperty'),
    // Orange: warm, mid-energy wooden knock
    [SoundEvent.LandOrange]: s('LandProperty'),
    // Red: sharp dramatic impact sting
    [SoundEvent.LandRed]: s('LandProperty'),
    // Yellow: bright shimmering chime
    [SoundEvent.LandYellow]: s('LandProperty'),
    // Green: deep, resonant success tone
    [SoundEvent.LandGreen]: s('LandProperty'),
    // Dark Blue: rich orchestral hit — these are the prime properties
    [SoundEvent.LandDarkBlue]: s('LandProperty'),

    // ── Landing on special spaces ─────────────────────────────────────────
    // Railroad: steam train whistle + short chug
    [SoundEvent.LandRailroad]: s('LandRailroad'),
    // Utility: electric hum (electric company) / water gurgle (waterworks)
    [SoundEvent.LandUtility]: s('LandProperty'),
    // Tax: cash register opening, sliding out money — reluctantly
    [SoundEvent.LandTax]: s('LandTax'),
    // Chance: card shuffle/flip with suspense
    [SoundEvent.LandChance]: s('LandChance'),
    // Community Chest: card shuffle + warm social "whoosh"
    [SoundEvent.LandCommunityChest]: s('LandChance'),
    // Free Parking: gentle "ahh" relief chord
    [SoundEvent.LandFreeParking]: s('LandFreeParking'),
    // GO corner: cash register ding
    [SoundEvent.LandGo]: s('LandFreeParking'),

    // ── Property transactions ─────────────────────────────────────────────
    // Buy property: paper signing sound + satisfying thunk of a stamp
    [SoundEvent.BuyProperty]: s('BuyProperty'),
    // Pay rent: coins drained out of a register, slightly sad
    [SoundEvent.PayRent]: s('PayRent'),
    // Collect rent: satisfying "cha-ching" cash register with coin jingle
    [SoundEvent.CollectRent]: s('CollectRent'),

    // ── Building ──────────────────────────────────────────────────────────
    // Build house: wooden block placed with a hollow tap
    [SoundEvent.BuildHouse]: s('BuildHotel'),
    // Build hotel: construction sequence ending in a triumphant flourish
    [SoundEvent.BuildHotel]: s('BuildHotel'),
    // Sell building: reverse tap, slightly deflating
    [SoundEvent.SellBuilding]: s('SellBuilding'),

    // ── Mortgage ──────────────────────────────────────────────────────────
    // Mortgage: heavy thud + cash register — trading deed for cash
    [SoundEvent.Mortgage]: s('Mortgage'),
    // Unmortgage: paper rustle + positive chord
    [SoundEvent.Unmortgage]: s('AuctionWin'),

    // ── Cards ─────────────────────────────────────────────────────────────
    // Card draw: crisp card flip with a hint of suspense
    [SoundEvent.CardDraw]: s('CardDraw'),

    // ── Auction ───────────────────────────────────────────────────────────
    // Auction start: auctioneer's gavel striking the block
    [SoundEvent.AuctionStart]: s('AuctionStart'),
    // Auction bid: quick satisfying click/tick — fast paced
    [SoundEvent.AuctionBid]: s('AuctionBid'),
    // Auction win: short victory sting + hammer slam
    [SoundEvent.AuctionWin]: s('AuctionWin'),

    // ── Jail ──────────────────────────────────────────────────────────────
    // Go to jail: dramatic descending trombone slide + heavy iron door clang
    [SoundEvent.GoToJail]: s('GoToJail'),
    // Get out of jail: key in lock + creak + freed ascending chord
    [SoundEvent.GetOutOfJail]: s('output'),

    // ── Trade ─────────────────────────────────────────────────────────────
    // Trade complete: handshake foley + satisfaction chime
    [SoundEvent.TradeComplete]: s('TradeComplete'),

    // ── Taxes ─────────────────────────────────────────────────────────────
    // Tax paid: coins clinking + register opening (similar to PayRent but sharper)
    [SoundEvent.TaxPaid]: s('TaxPaid'),

    // ── End game ──────────────────────────────────────────────────────────
    // Bankruptcy: sad trombone descend ("wah wah wah waaah")
    [SoundEvent.Bankruptcy]: s('Bankruptcy'),
    // Victory: full triumphant brass fanfare
    [SoundEvent.Victory]: s('Victory'),
  },

  // Optional per-event volume overrides (relative to masterVolume)
  volume: {
    [SoundEvent.TokenMove]: 0.5, // subtle movement ticks
    [SoundEvent.OpponentTurn]: 0.5, // quieter than your own turn signal
    [SoundEvent.AuctionBid]: 0.7, // don't overpower rapid bidding
  },
};

/**
 * Sprite-based variant of the classic theme.
 * Use this in production after running audiosprite to bundle all sounds.
 *
 * Generate with:
 *   npx audiosprite --output public/sounds/classic/sprite \
 *     --format howle2 --export ogg,mp3 \
 *     public/sounds/classic/raw/*.mp3
 *
 * Then import the generated JSON and pass its sprite key as spriteMap.
 *
 * Until you have the sprite file ready, use `classicTheme` above.
 */
export const classicSpriteTheme: SoundTheme = {
  id: 'classic-sprite',
  name: 'Classic Monopoly (Sprite)',
  masterVolume: 0.8,
  sprite: ['/sounds/classic/sprite.webm', '/sounds/classic/sprite.mp3'],
  // Populate spriteMap from the audiosprite-generated JSON after bundling
  spriteMap: {},
  volume: {
    [SoundEvent.TokenMove]: 0.5,
    [SoundEvent.OpponentTurn]: 0.5,
    [SoundEvent.AuctionBid]: 0.7,
  },
};
