import { describe, it, expect } from 'vitest';
import { TurnStateMachine } from '../../engine/turn-machine';
import { TurnState } from '../../types/turn';

describe('Step 1A.2 — Turn State Machine', () => {
  it('P1A.S2.T1: starts in WaitingForRoll; invalid action throws', () => {
    const machine = new TurnStateMachine();
    expect(machine.currentState).toBe(TurnState.WaitingForRoll);
    expect(() => machine.transition({ type: 'BuyProperty', propertyId: 1 })).toThrow();
  });

  it('P1A.S2.T2: WaitingForRoll → Rolling on RollDice', () => {
    const machine = new TurnStateMachine();
    machine.transition({ type: 'RollDice' });
    expect(machine.currentState).toBe(TurnState.Rolling);
  });

  it('P1A.S2.T2: WaitingForRoll rejects BuyProperty', () => {
    const machine = new TurnStateMachine();
    expect(() => machine.transition({ type: 'BuyProperty', propertyId: 1 })).toThrow();
  });

  it('P1A.S2.T3: Rolling → Resolving', () => {
    const machine = new TurnStateMachine(TurnState.Rolling);
    machine.transition({ type: 'RollDice' }); // any action triggers auto-transition
    expect(machine.currentState).toBe(TurnState.Resolving);
  });

  it('P1A.S2.T4: Resolving → AwaitingBuyDecision on unowned property', () => {
    const machine = new TurnStateMachine(TurnState.Resolving);
    machine.transition({ type: 'RollDice' }, { landedOnUnownedProperty: true });
    expect(machine.currentState).toBe(TurnState.AwaitingBuyDecision);
  });

  it('P1A.S2.T5: AwaitingBuyDecision → Auction on decline', () => {
    const machine = new TurnStateMachine(TurnState.AwaitingBuyDecision);
    machine.transition({ type: 'DeclineProperty', propertyId: 1 });
    expect(machine.currentState).toBe(TurnState.Auction);
  });

  it('P1A.S2.T5: AwaitingBuyDecision → PlayerAction on buy', () => {
    const machine = new TurnStateMachine(TurnState.AwaitingBuyDecision);
    machine.transition({ type: 'BuyProperty', propertyId: 1 });
    expect(machine.currentState).toBe(TurnState.PlayerAction);
  });

  it('P1A.S2.T6: Auction → PlayerAction when auction completes', () => {
    const machine = new TurnStateMachine(TurnState.Auction);
    machine.transition({ type: 'AuctionPass' }, { auctionComplete: true });
    expect(machine.currentState).toBe(TurnState.PlayerAction);
  });

  it('P1A.S2.T7: Resolving → PlayerAction on owned property', () => {
    const machine = new TurnStateMachine(TurnState.Resolving);
    machine.transition({ type: 'RollDice' }, { landedOnUnownedProperty: false });
    expect(machine.currentState).toBe(TurnState.PlayerAction);
  });

  it('P1A.S2.T8: PlayerAction → EndTurn on EndTurn action', () => {
    const machine = new TurnStateMachine(TurnState.PlayerAction);
    machine.transition({ type: 'EndTurn' });
    expect(machine.currentState).toBe(TurnState.EndTurn);
  });

  it('P1A.S2.T9: EndTurn → WaitingForRoll', () => {
    const machine = new TurnStateMachine(TurnState.EndTurn);
    machine.transition({ type: 'EndTurn' });
    expect(machine.currentState).toBe(TurnState.WaitingForRoll);
  });

  it('P1A.S2.T10: doubles → EndTurn goes to WaitingForRoll for SAME player', () => {
    const machine = new TurnStateMachine(TurnState.PlayerAction);
    machine.rolledDoubles = true;
    machine.transition({ type: 'EndTurn' });
    // When doubles: EndTurn -> WaitingForRoll (same player gets another roll)
    expect(machine.currentState).toBe(TurnState.WaitingForRoll);
  });

  it('P1A.S2.T11: getValidActions returns correct actions for each state', () => {
    const machine = new TurnStateMachine(TurnState.WaitingForRoll);
    expect(machine.getValidActions()).toContain('RollDice');

    const machine2 = new TurnStateMachine(TurnState.PlayerAction);
    const actions = machine2.getValidActions();
    expect(actions).toContain('BuildHouse');
    expect(actions).toContain('MortgageProperty');
    expect(actions).toContain('ProposeTrade');
    expect(actions).toContain('EndTurn');

    const machine3 = new TurnStateMachine(TurnState.AwaitingBuyDecision);
    expect(machine3.getValidActions()).toEqual(['BuyProperty', 'DeclineProperty']);
  });
});
