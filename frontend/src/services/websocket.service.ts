import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer, EMPTY } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { catchError, tap, switchMap, retryWhen, delay } from 'rxjs/operators';

export interface WebSocketMessage {
  type: string;
  gameId?: string;
  playerId?: string;
  playerNickname?: string;
  data?: any;
  errorMessage?: string;
  timestamp?: number;
}

export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;
  private messageSubject$ = new Subject<WebSocketMessage>();
  private connectionStatusSubject$ = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  
  // Configuration
  private readonly RECONNECT_INTERVAL = 3000; // 3 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5; // Reduced for faster fallback
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
  // State tracking
  private reconnectAttempts = 0;
  private heartbeatTimer: any = null;
  private currentGameId: string | null = null;
  private playerNickname: string | null = null;

  // Public observables
  public messages$ = this.messageSubject$.asObservable();
  public connectionStatus$ = this.connectionStatusSubject$.asObservable();

  constructor() {
    this.playerNickname = localStorage.getItem('nickname');
  }

  /**
   * Connect to WebSocket for a specific game
   */
  connect(gameId: string): Observable<WebSocketMessage> {
    if (this.socket$ && !this.socket$.closed) {
      console.log('WebSocket already connected');
      return this.messages$;
    }

    this.currentGameId = gameId;
    this.connectionStatusSubject$.next(ConnectionStatus.CONNECTING);

    // Fixed WebSocket URL construction
    const wsUrl = this.getWebSocketUrl(gameId);
    console.log('Connecting to WebSocket:', wsUrl);

    this.socket$ = webSocket({
      url: wsUrl,
      openObserver: {
        next: () => {
          console.log('WebSocket connected successfully');
          this.connectionStatusSubject$.next(ConnectionStatus.CONNECTED);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // Send initial player identification
          this.sendPlayerInfo();
        }
      },
      closeObserver: {
        next: (event) => {
          console.log('WebSocket connection closed:', event);
          this.connectionStatusSubject$.next(ConnectionStatus.DISCONNECTED);
          this.stopHeartbeat();
          
          // Only try to reconnect if it wasn't a manual disconnect
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        }
      }
    });

    // Subscribe to incoming messages
    this.socket$.pipe(
      tap(message => {
        console.log('Received WebSocket message:', message);
        this.handleIncomingMessage(message);
      }),
      catchError(error => {
        console.error('WebSocket error:', error);
        this.connectionStatusSubject$.next(ConnectionStatus.ERROR);
        this.scheduleReconnect();
        return EMPTY;
      })
    ).subscribe();

    return this.messages$;
  }

  /**
   * Send message through WebSocket with better error handling
   */
  send(message: WebSocketMessage): void {
    if (!this.socket$ || this.socket$.closed) {
      console.warn('WebSocket not connected, cannot send message:', message);
      // Emit connection error for fallback handling
      this.connectionStatusSubject$.next(ConnectionStatus.ERROR);
      return;
    }

    try {
      // Add metadata to message
      const enrichedMessage: WebSocketMessage = {
        ...message,
        gameId: message.gameId || this.currentGameId || undefined,
        playerId: this.getPlayerId(),
        playerNickname: this.playerNickname || undefined,
        timestamp: Date.now()
      };

      console.log('Sending WebSocket message:', enrichedMessage);
      this.socket$.next(enrichedMessage);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.connectionStatusSubject$.next(ConnectionStatus.ERROR);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.connectionStatusSubject$.next(ConnectionStatus.DISCONNECTED);
    this.currentGameId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectionStatusSubject$.value === ConnectionStatus.CONNECTED;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatusSubject$.value;
  }

  /**
   * Handle incoming messages and route them to appropriate handlers
   */
  private handleIncomingMessage(message: WebSocketMessage): void {
    // Reset error state on successful message
    if (this.connectionStatusSubject$.value === ConnectionStatus.ERROR) {
      this.connectionStatusSubject$.next(ConnectionStatus.CONNECTED);
    }

    switch (message.type) {
      case 'HEARTBEAT_RESPONSE':
        // Heartbeat acknowledgment, no action needed
        console.log('Heartbeat response received');
        break;
      
      case 'ERROR':
        console.error('Server error:', message.errorMessage);
        this.connectionStatusSubject$.next(ConnectionStatus.ERROR);
        break;
      
      default:
        // Forward all other messages to subscribers
        this.messageSubject$.next(message);
        break;
    }
  }

  /**
   * Schedule reconnection attempt with backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached, switching to polling fallback`);
      this.connectionStatusSubject$.next(ConnectionStatus.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatusSubject$.next(ConnectionStatus.RECONNECTING);
    
    // Exponential backoff: 3s, 6s, 12s, etc.
    const backoffDelay = this.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${backoffDelay}ms`);
    
    timer(backoffDelay).subscribe(() => {
      if (this.currentGameId) {
        this.connect(this.currentGameId);
      }
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'HEARTBEAT' });
      } else {
        this.stopHeartbeat();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Get WebSocket URL based on current location and game ID
   */
  private getWebSocketUrl(gameId: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // Use different ports for development vs production
    let port: string;
    if (host === 'localhost' || host === '127.0.0.1') {
      port = '8080'; // Backend port for development
    } else {
      port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    }
    
    // Construct the full WebSocket URL
    return `${protocol}//${host}:${port}/ws/game/${gameId}`;
  }

  /**
   * Get unique player ID
   */
  private getPlayerId(): string {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = 'player_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('playerId', playerId);
    }
    return playerId;
  }

  /**
   * Request full game synchronization (fallback mechanism)
   */
  requestSync(): void {
    this.send({ type: 'SYNC_REQUEST' });
  }

  /**
   * Send player identification info after connection
   */
  private sendPlayerInfo(): void {
    // Send player info for server-side session management
    this.send({
      type: 'PLAYER_IDENTIFICATION',
      data: {
        playerId: this.getPlayerId(),
        playerNickname: this.playerNickname,
        gameId: this.currentGameId
      }
    });
  }

  /**
   * Update player nickname
   */
  updatePlayerNickname(nickname: string): void {
    this.playerNickname = nickname;
    localStorage.setItem('nickname', nickname);
  }

  /**
   * Force reconnection (useful for manual retry)
   */
  forceReconnect(): void {
    this.disconnect();
    if (this.currentGameId) {
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect(this.currentGameId!);
      }, 1000);
    }
  }
}