'use client';

import { use, useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TurnState, GameEventType, SpaceType } from '@monopoly/shared';
import type { Property, TradeOfferPayload } from '@monopoly/shared';
import { GameStateProvider, useGameState } from '../../../src/hooks/useGameState';
import { LoadingSkeleton } from '../../../src/components/ui/LoadingSkeleton';
import { ConnectionError } from '../../../src/components/connection/ConnectionError';
import { GameLayout } from '../../../src/components/dashboard/GameLayout';
import { GameplayController } from '../../../src/components/gameplay/GameplayController';
import { BuildingManager } from '../../../src/components/building/BuildingManager';
import type { BuildingSupply } from '../../../src/components/building/BuildingManager';
import { MortgageManager } from '../../../src/components/mortgage/MortgageManager';
import { TradeBuilder } from '../../../src/components/trading/TradeBuilder';
import { AuctionPanel } from '../../../src/components/auction/AuctionPanel';
import type { AuctionInfo } from '../../../src/components/auction/AuctionPanel';
import { ChatPanel } from '../../../src/components/chat/ChatPanel';
import { VictoryScreen } from '../../../src/components/endgame/VictoryScreen';
import { ReconnectionOverlay } from '../../../src/components/connection/ReconnectionOverlay';
import styles from './GamePage.module.css';

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);

  return (
    <GameStateProvider>
      <Suspense fallback={<LoadingSkeleton />}>
        <GameContent gameId={gameId} />
      </Suspense>
    </GameStateProvider>
  );
}

function GameContent({ gameId }: { gameId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room');
  const pidParam = searchParams.get('pid');
  const {
    connected,
    playerId,
    roomCode,
    gameState,
    chatMessages,
    gameOverData,
    turnTimer,
    emitAction,
    socket,
    dispatch,
  } = useGameState();

  // --- Auto-reconnect when arriving from lobby ---
  const [reconnectAttempted, setReconnectAttempted] = useState(false);

  useEffect(() => {
    if (connected && roomParam && pidParam && !gameState && !reconnectAttempted) {
      setReconnectAttempted(true);
      socket.reconnect(roomParam, pidParam).then((result) => {
        if (result.ok) {
          dispatch({ type: 'SET_ROOM', room: result.room ?? null, roomCode: roomParam });
          if (result.gameState) {
            dispatch({ type: 'STATE_UPDATE', state: result.gameState });
          }
        }
      });
    }
  }, [connected, roomParam, pidParam, gameState, reconnectAttempted, socket, dispatch]);

  // --- Local UI state (hooks must be called unconditionally) ---
  const [showBuildingManager, setShowBuildingManager] = useState(false);
  const [showMortgageManager, setShowMortgageManager] = useState(false);
  const [showTradeBuilder, setShowTradeBuilder] = useState(false);

  // Effective room code — from context state or URL param
  const effectiveRoomCode = roomCode || roomParam;

  // --- Derived state ---
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex] ?? null;
  const localPlayer = gameState?.players.find((p) => p.id === (playerId || pidParam)) ?? null;
  const isMyTurn = !!(currentPlayer && currentPlayer.id === (playerId || pidParam));
  const isPlayerAction = gameState?.turnState === TurnState.PlayerAction;
  const isAuction = gameState?.turnState === TurnState.Auction;
  const showAssetManagement = isMyTurn && isPlayerAction && !localPlayer?.isBankrupt;

  // Derive Property[] from board + player ownership
  const properties = useMemo((): Property[] => {
    if (!gameState) return [];
    const props: Property[] = [];
    for (const player of gameState.players) {
      for (const spaceId of player.properties) {
        const space = gameState.board.find((s) => s.id === spaceId);
        if (!space) continue;
        let type: 'street' | 'railroad' | 'utility' = 'street';
        if (space.type === SpaceType.Railroad) type = 'railroad';
        else if (space.type === SpaceType.Utility) type = 'utility';
        props.push({
          spaceId: space.id,
          name: space.name,
          type,
          colorGroup: space.colorGroup,
          cost: space.cost ?? 0,
          rentTiers: space.rentTiers ?? [],
          mortgaged: false,
          ownerId: player.id,
          houses: 0,
        });
      }
    }
    return props;
  }, [gameState]);

  // Building supply (default — server tracks actual supply internally)
  const buildingSupply = useMemo((): BuildingSupply => ({ houses: 32, hotels: 12 }), []);

  // Derive auction info from game events when in Auction phase
  const auctionData = useMemo(() => {
    if (!isAuction || !gameState) return null;

    const auctionEvents = gameState.events.filter(
      (e) => e.type === GameEventType.AuctionStarted || e.type === GameEventType.AuctionBid,
    );

    const lastStart = [...auctionEvents]
      .reverse()
      .find((e) => e.type === GameEventType.AuctionStarted);
    if (!lastStart) return null;

    const propertyId = lastStart.payload.propertyId as number;
    const space = gameState.board.find((s) => s.id === propertyId);
    if (!space) return null;

    // Get bid events after the last AuctionStarted
    const bidEvents = auctionEvents.filter(
      (e) => e.type === GameEventType.AuctionBid && e.timestamp >= lastStart.timestamp,
    );

    let highBid = 0;
    let highBidderId: string | null = null;
    const passedPlayers: string[] = [];

    for (const evt of bidEvents) {
      if (evt.payload.passed) {
        passedPlayers.push(evt.payload.playerId as string);
      } else {
        const amount = evt.payload.amount as number;
        if (amount > highBid) {
          highBid = amount;
          highBidderId = evt.payload.playerId as string;
        }
      }
    }

    const eligiblePlayers = gameState.players
      .filter((p) => p.isActive && !p.isBankrupt)
      .map((p) => p.id);

    const info: AuctionInfo = { propertyId, highBid, highBidderId, eligiblePlayers, passedPlayers };
    return { info, space };
  }, [isAuction, gameState]);

  // --- Action handlers ---
  const handleBuildHouse = useCallback(
    (propertyId: number) => {
      emitAction({ type: 'BuildHouse', propertyId });
    },
    [emitAction],
  );

  const handleSellBuilding = useCallback(
    (propertyId: number) => {
      emitAction({ type: 'SellBuilding', propertyId, count: 1 });
    },
    [emitAction],
  );

  const handleMortgage = useCallback(
    (propertyId: number) => {
      emitAction({ type: 'MortgageProperty', propertyId });
    },
    [emitAction],
  );

  const handleUnmortgage = useCallback(
    (propertyId: number) => {
      emitAction({ type: 'UnmortgageProperty', propertyId });
    },
    [emitAction],
  );

  const handleSendTradeOffer = useCallback(
    (recipientId: string, offer: TradeOfferPayload) => {
      emitAction({ type: 'ProposeTrade', recipientId, offer });
      setShowTradeBuilder(false);
    },
    [emitAction],
  );

  const handleAuctionBid = useCallback(
    (amount: number) => {
      emitAction({ type: 'AuctionBid', amount });
    },
    [emitAction],
  );

  const handleAuctionPass = useCallback(() => {
    emitAction({ type: 'AuctionPass' });
  }, [emitAction]);

  const handleSendChat = useCallback(
    (message: string) => {
      if (effectiveRoomCode) {
        socket.sendChatMessage(effectiveRoomCode, message);
      }
    },
    [socket, effectiveRoomCode],
  );

  const handlePlayAgain = useCallback(() => {
    if (effectiveRoomCode) {
      router.push(`/lobby/${effectiveRoomCode}`);
    } else {
      router.push('/');
    }
  }, [router, effectiveRoomCode]);

  const handleLeave = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleRetryConnection = useCallback(() => {
    const code = effectiveRoomCode;
    const pid = playerId || pidParam;
    if (code && pid) {
      socket.reconnect(code, pid);
    }
  }, [socket, effectiveRoomCode, playerId, pidParam]);

  // --- Loading / error states ---
  if (!gameState && connected) {
    return <LoadingSkeleton />;
  }

  if (!connected && !gameState) {
    return <ConnectionError onRetry={handleRetryConnection} />;
  }

  if (!gameState) {
    return <LoadingSkeleton />;
  }

  const effectivePlayerId = playerId || pidParam;

  // --- Main game UI ---
  return (
    <main className={styles.gamePage} data-testid="game-page" data-game-id={gameId}>
      {/* P1.S3.T2: Main layout with board + dashboard */}
      <GameLayout
        spaces={gameState.board}
        players={gameState.players}
        properties={properties}
        currentPlayer={localPlayer ?? currentPlayer!}
        turnState={gameState.turnState}
        isCurrentPlayersTurn={isMyTurn}
      />

      {/* P1.S3.T3: Gameplay controller (dice, buy/decline, jail, cards, activity feed) */}
      <GameplayController
        gameState={gameState}
        localPlayerId={effectivePlayerId}
        emitAction={emitAction}
      />

      {/* P1.S3.T4: Building & Mortgage managers (only during PlayerAction phase, local player's turn) */}
      {localPlayer && (
        <>
          <BuildingManager
            isOpen={showBuildingManager && !!showAssetManagement}
            player={localPlayer}
            properties={properties}
            board={gameState.board}
            supply={buildingSupply}
            onBuildHouse={handleBuildHouse}
            onSellBuilding={handleSellBuilding}
            onClose={() => setShowBuildingManager(false)}
          />
          <MortgageManager
            isOpen={showMortgageManager && !!showAssetManagement}
            player={localPlayer}
            properties={properties}
            board={gameState.board}
            onMortgage={handleMortgage}
            onUnmortgage={handleUnmortgage}
            onClose={() => setShowMortgageManager(false)}
          />
        </>
      )}

      {/* P1.S3.T4: Asset management buttons (visible during PlayerAction phase) */}
      {showAssetManagement && (
        <div className={styles.assetActions} data-testid="asset-actions">
          <button
            className={styles.assetButton}
            onClick={() => setShowBuildingManager(true)}
            data-testid="open-building-manager"
          >
            Build
          </button>
          <button
            className={styles.assetButton}
            onClick={() => setShowMortgageManager(true)}
            data-testid="open-mortgage-manager"
          >
            Mortgage
          </button>
          <button
            className={styles.assetButton}
            onClick={() => setShowTradeBuilder(true)}
            data-testid="open-trade-builder"
          >
            Trade
          </button>
        </div>
      )}

      {/* P1.S3.T5: Trade Builder */}
      {localPlayer && (
        <TradeBuilder
          isOpen={showTradeBuilder}
          currentPlayer={localPlayer}
          otherPlayers={gameState.players.filter(
            (p) => p.id !== effectivePlayerId && p.isActive && !p.isBankrupt,
          )}
          properties={properties}
          onSendOffer={handleSendTradeOffer}
          onClose={() => setShowTradeBuilder(false)}
        />
      )}

      {/* P1.S3.T6: Auction Panel */}
      {isAuction && auctionData && effectivePlayerId && (
        <AuctionPanel
          isOpen
          space={auctionData.space}
          auction={auctionData.info}
          currentPlayerId={effectivePlayerId}
          players={gameState.players}
          onBid={handleAuctionBid}
          onPass={handleAuctionPass}
        />
      )}

      {/* P1.S3.T7: Chat Panel */}
      <ChatPanel
        messages={chatMessages}
        localPlayerId={effectivePlayerId}
        onSendMessage={handleSendChat}
      />

      {/* P1.S3.T8: Victory Screen */}
      {gameOverData && (
        <VictoryScreen
          gameState={gameState}
          winnerId={gameOverData.winnerId}
          onPlayAgain={handlePlayAgain}
          onLeave={handleLeave}
        />
      )}

      {/* P1.S3.T9: Reconnection Overlay */}
      <ReconnectionOverlay isDisconnected={!connected} />

      {/* P1.S3.T10: Turn timer countdown */}
      {turnTimer && turnTimer.secondsRemaining > 0 && (
        <div
          className={`${styles.turnTimer} ${turnTimer.secondsRemaining <= 10 ? styles.turnTimerUrgent : ''}`}
          data-testid="turn-timer"
          role="timer"
          aria-label={`${turnTimer.secondsRemaining} seconds remaining`}
        >
          <span className={styles.timerIcon}>&#9200;</span>
          <span className={styles.timerValue}>{turnTimer.secondsRemaining}s</span>
        </div>
      )}
    </main>
  );
}
