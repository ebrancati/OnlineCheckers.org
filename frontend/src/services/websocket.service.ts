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
  private readonly WS_ENDPOINT = this.getWebSocketUrl();
  private readonly RECONNECT_INTERVAL = 3000; // 3 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
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

    const wsUrl = `${this.WS_ENDPOINT}/ws/game/${gameId}`;
    console.log('Connecting to WebSocket:', wsUrl);

    this.socket$ = webSocket({
      url: wsUrl,
      openObserver: {
        next: () => {
          console.log('WebSocket connected successfully');
          this.connectionStatusSubject$.next(ConnectionStatus.CONNECTED);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // Send player info in headers simulation
          this.sendPlayerInfo();
        }
      },
      closeObserver: {
        next: () => {
          console.log('WebSocket connection closed');
          this.connectionStatusSubject$.next(ConnectionStatus.DISCONNECTED);
          this.stopHeartbeat();
          this.scheduleReconnect();
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
   * Send message through WebSocket
   */
  send(message: WebSocketMessage): void {
    if (!this.socket$ || this.socket$.closed) {
      console.warn('WebSocket not connected, cannot send message:', message);
      return;
    }

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
    switch (message.type) {
      case 'HEARTBEAT_RESPONSE':
        // Heartbeat acknowledgment, no action needed
        break;
      
      case 'ERROR':
        console.error('Server error:', message.errorMessage);
        break;
      
      default:
        // Forward all other messages to subscribers
        this.messageSubject$.next(message);
        break;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.connectionStatusSubject$.next(ConnectionStatus.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatusSubject$.next(ConnectionStatus.RECONNECTING);
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${this.RECONNECT_INTERVAL}ms`);
    
    timer(this.RECONNECT_INTERVAL).subscribe(() => {
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
   * Get WebSocket URL based on current location
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Always use backend port (8080) for WebSocket, not frontend port
    const host = window.location.hostname;
    const port = '8080'; // Backend port
    return `${protocol}//${host}:${port}`;
  }

  /**
   * Get unique player ID (you might want to implement this differently)
   */
  private getPlayerId(): string {
    // Simple implementation - you might want to use a more robust player ID system
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
    // Send a special message to identify the player
    this.send({
      type: 'PLAYER_IDENTIFICATION',
      data: {
        playerId: this.getPlayerId(),
        playerNickname: this.playerNickname
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
}