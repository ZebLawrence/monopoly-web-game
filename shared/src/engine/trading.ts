import type { GameState } from '../types/gameState';
import type { TradeOffer } from '../types/trade';
import type { TradeOfferPayload } from '../types/gameAction';
import { getPlayerById } from './state';
import { getPropertyState, getColorGroupSpaces } from './spaces';

let _tradeCounter = 0;

export function createTradeOffer(
  state: GameState,
  proposerId: string,
  recipientId: string,
  offer: TradeOfferPayload,
): { state: GameState; trade: TradeOffer } {
  const newState = deepClone(state);

  // Validate proposer
  const proposer = getPlayerById(newState, proposerId);
  if (!proposer) throw new Error('Proposer not found');

  const recipient = getPlayerById(newState, recipientId);
  if (!recipient) throw new Error('Recipient not found');

  // Validate proposer owns all offered properties
  for (const propId of offer.offeredProperties) {
    if (!proposer.properties.includes(propId)) {
      throw new Error(`Proposer does not own property ${propId}`);
    }
    validateNoBuildings(newState, propId);
  }

  // Validate recipient owns all requested properties
  for (const propId of offer.requestedProperties) {
    if (!recipient.properties.includes(propId)) {
      throw new Error(`Recipient does not own property ${propId}`);
    }
    validateNoBuildings(newState, propId);
  }

  // Validate cash
  if (offer.offeredCash > proposer.cash) {
    throw new Error('Proposer cannot afford offered cash');
  }

  // Validate GOOJF cards
  if (offer.offeredCards > proposer.getOutOfJailFreeCards) {
    throw new Error('Proposer does not have enough GOOJF cards');
  }
  if (offer.requestedCards > recipient.getOutOfJailFreeCards) {
    throw new Error('Recipient does not have enough GOOJF cards');
  }

  const trade: TradeOffer = {
    id: `trade-${++_tradeCounter}`,
    proposerId,
    recipientId,
    offeredProperties: [...offer.offeredProperties],
    offeredCash: offer.offeredCash,
    offeredCards: offer.offeredCards,
    requestedProperties: [...offer.requestedProperties],
    requestedCash: offer.requestedCash,
    requestedCards: offer.requestedCards,
    status: 'pending',
  };

  return { state: newState, trade };
}

function validateNoBuildings(state: GameState, spaceId: number): void {
  const space = state.board.find((s) => s.id === spaceId);
  if (!space) return;

  if (space.colorGroup) {
    const groupSpaces = getColorGroupSpaces(state, space.colorGroup);
    for (const gs of groupSpaces) {
      const propState = getPropertyState(state, gs.id);
      if (propState && propState.houses > 0) {
        throw new Error(`Cannot trade — buildings exist in ${space.colorGroup} color group`);
      }
    }
  }
}

// Trade store
const _trades = new Map<string, TradeOffer>();

export function storeTrade(trade: TradeOffer): void {
  _trades.set(trade.id, trade);
}

export function getTrade(tradeId: string): TradeOffer | undefined {
  return _trades.get(tradeId);
}

export function acceptTrade(state: GameState, tradeId: string): GameState {
  const trade = getTrade(tradeId);
  if (!trade) throw new Error(`Trade ${tradeId} not found`);
  if (trade.status !== 'pending') throw new Error('Trade is not pending');

  const newState = deepClone(state);
  const proposer = getPlayerById(newState, trade.proposerId);
  const recipient = getPlayerById(newState, trade.recipientId);
  if (!proposer || !recipient) throw new Error('Players not found');

  // Transfer properties from proposer to recipient
  for (const propId of trade.offeredProperties) {
    proposer.properties = proposer.properties.filter((id) => id !== propId);
    recipient.properties.push(propId);
  }

  // Transfer properties from recipient to proposer
  for (const propId of trade.requestedProperties) {
    recipient.properties = recipient.properties.filter((id) => id !== propId);
    proposer.properties.push(propId);
  }

  // Transfer cash
  proposer.cash -= trade.offeredCash;
  recipient.cash += trade.offeredCash;
  recipient.cash -= trade.requestedCash;
  proposer.cash += trade.requestedCash;

  // Transfer GOOJF cards
  proposer.getOutOfJailFreeCards -= trade.offeredCards;
  recipient.getOutOfJailFreeCards += trade.offeredCards;
  recipient.getOutOfJailFreeCards -= trade.requestedCards;
  proposer.getOutOfJailFreeCards += trade.requestedCards;

  // Mark trade as accepted
  trade.status = 'accepted';
  _trades.set(tradeId, trade);

  return newState;
}

export function rejectTrade(state: GameState, tradeId: string): GameState {
  const trade = getTrade(tradeId);
  if (!trade) throw new Error(`Trade ${tradeId} not found`);

  trade.status = 'rejected';
  _trades.set(tradeId, trade);

  // No state change
  return deepClone(state);
}

export function counterTrade(
  state: GameState,
  tradeId: string,
  newOffer: TradeOfferPayload,
): { state: GameState; trade: TradeOffer } {
  const originalTrade = getTrade(tradeId);
  if (!originalTrade) throw new Error(`Trade ${tradeId} not found`);

  // Mark original as countered
  originalTrade.status = 'countered';
  _trades.set(tradeId, originalTrade);

  // Create new trade with swapped roles
  return createTradeOffer(state, originalTrade.recipientId, originalTrade.proposerId, newOffer);
}

export function resetTrades(): void {
  _trades.clear();
  _tradeCounter = 0;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
