'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@monopoly/shared';
import styles from './ChatPanel.module.css';

const PLAYER_COLORS = [
  '#1565C0',
  '#D32F2F',
  '#388E3C',
  '#FF8F00',
  '#7B1FA2',
  '#00838F',
  '#C62828',
  '#1B5E20',
];

export interface ChatPanelProps {
  messages: ChatMessage[];
  localPlayerId: string | null;
  onSendMessage: (message: string) => void;
  playerColorMap?: Record<string, string>;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({
  messages,
  localPlayerId: _localPlayerId,
  onSendMessage,
  playerColorMap = {},
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  const getPlayerColor = useCallback(
    (playerId: string): string => {
      if (playerColorMap[playerId]) return playerColorMap[playerId];
      // Simple hash to pick a color
      let hash = 0;
      for (let i = 0; i < playerId.length; i++) {
        hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
      }
      return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
    },
    [playerColorMap],
  );

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
    setIsScrolledUp(false);
    setUnreadCount(0);
  }, []);

  // Auto-scroll on new messages if not scrolled up
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      if (!isScrolledUp) {
        scrollToBottom();
      } else {
        setUnreadCount((prev) => prev + (messages.length - lastMessageCountRef.current));
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isScrolledUp, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setIsScrolledUp(!isAtBottom);
    if (isAtBottom) setUnreadCount(0);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Handle virtual keyboard — scroll input into view on focus
  const inputRef = useRef<HTMLInputElement>(null);
  const handleInputFocus = useCallback(() => {
    // On mobile, the virtual keyboard pushes content up.
    // Scroll the input into view after a short delay for keyboard animation.
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
  }, []);

  const chatContent = (
    <div className={styles.container} data-testid="chat-panel">
      <div className={styles.header}>
        <span>Chat</span>
      </div>

      <div
        className={styles.messageList}
        ref={messageListRef}
        onScroll={handleScroll}
        data-testid="chat-message-list"
      >
        {messages.length === 0 && <div className={styles.empty}>No messages yet</div>}
        {messages.map((msg) => (
          <div key={msg.id} className={styles.message} data-testid="chat-message">
            <span className={styles.messageName} style={{ color: getPlayerColor(msg.playerId) }}>
              {msg.playerName}
            </span>
            {msg.isSpectator && <span className={styles.spectatorBadge}>Spectator</span>}
            <span className={styles.messageText}>{msg.message}</span>
            <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
          </div>
        ))}
      </div>

      {isScrolledUp && unreadCount > 0 && (
        <div
          className={styles.newMessagesBar}
          onClick={scrollToBottom}
          data-testid="new-messages-bar"
        >
          {unreadCount} new message{unreadCount > 1 ? 's' : ''}
        </div>
      )}

      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder="Type a message..."
          maxLength={500}
          enterKeyHint="send"
          data-testid="chat-input"
          aria-label="Chat message"
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!input.trim()}
          data-testid="chat-send"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view */}
      {chatContent}

      {/* Mobile toggle */}
      <div className={styles.mobileToggle}>
        <button
          className={styles.toggleButton}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close chat' : 'Open chat'}
          data-testid="chat-mobile-toggle"
        >
          &#x1F4AC;
          {!mobileOpen && unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={styles.mobileDrawer} data-testid="chat-mobile-drawer">
          {chatContent}
        </div>
      )}
    </>
  );
}
