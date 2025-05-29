import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, throwError } from 'rxjs';
import { filter, takeUntil, catchError, timeout } from 'rxjs/operators';
import { WebSocketService, WebSocketMessage, ConnectionStatus } from './websocket.service';
import { HttpClient } from '@angular/common/http';

// Message type constants
export const WS_MESSAGE_TYPES = {
  // Client to Server
  MOVE: 'MOVE',
  CHAT: 'CHAT',
  RESTART_REQUEST: 'RESTART_REQUEST',
  SYNC_REQUEST: 'SYNC_REQUEST',
  HEARTBEAT: 'HEARTBEAT',
  
  // Server to Client
  GAME_UPDATE: 'GAME_UPDATE',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  GAME_RESET: 'GAME_RESET',
  RESTART_STATUS_UPDATE: 'RESTART_STATUS_UPDATE',
  FULL_SYNC: 'FULL_SYNC',
  HEARTBEAT_RESPONSE: 'HEARTBEAT_RESPONSE',
  ERROR: 'ERROR',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT'
} as const;

export interface GameUpdateData {
  id: string;
  board: string[][];
  turno: 'WHITE' | 'BLACK' | 'NONE';
  pedineW: number;
  pedineB: number;
  damaW: number;
  damaB: number;
  partitaTerminata: boolean;
  vincitore: 'WHITE' | 'BLACK' | 'NONE';
  players: any[];
  chat: string;
  cronologiaMosse: string[];
  lastMultiCapturePath?: string[];
}

export interface RestartStatusData {
  gameID: string;
  nicknameB: string;
  nicknameW: string;
  restartB: boolean;
  restartW: boolean;
}

export interface ChatMessageData {
  player: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketGameService {
  private destroy$ = new Subject<void>();
  private currentGameId: string | null = null;
  
  // Observables for different message types
  private gameUpdateSubject$ = new BehaviorSubject<GameUpdateData | null>(null);
  private chatMessageSubject$ = new Subject<ChatMessageData>();
  private restartStatusSubject$ = new BehaviorSubject<RestartStatusData | null>(null);
  private playerJoinedSubject$ = new Subject<{playerId: string, playerNickname: string}>();
  private playerLeftSubject$ = new Subject<{playerId: string, playerNickname: string}>();
  private gameResetSubject$ = new Subject<void>();
  private errorSubject$ = new Subject<string>();

  // Public observables
  public gameUpdate$ = this.gameUpdateSubject$.asObservable();
  public chatMessage$ = this.chatMessageSubject$.asObservable();
  public restartStatus$ = this.restartStatusSubject$.asObservable();
  public playerJoined$ = this.playerJoinedSubject$.asObservable();
  public playerLeft$ = this.playerLeftSubject$.asObservable();
  public gameReset$ = this.gameResetSubject$.asObservable();
  public error$ = this.errorSubject$.asObservable();
  public connectionStatus$!: Observable<ConnectionStatus>;

  // Fallback configuration
  private readonly FALLBACK_DELAY = 5000; // 5 seconds before fallback to polling
  private readonly MESSAGE_TIMEOUT = 10000; // 10 seconds timeout for critical operations
  
  // State tracking
  private isUsingWebSocket = false;
  private lastSyncTime = 0;
  private pendingMoves = new Map<string, any>(); // Track moves waiting for confirmation

  constructor(
    private webSocketService: WebSocketService,
    private http: HttpClient
  ) {
    this.connectionStatus$ = this.webSocketService.connectionStatus$;
  }

  /**
   * Initialize WebSocket connection for a game with fallback logic
   */
  initializeConnection(gameId: string): Observable<boolean> {
    this.currentGameId = gameId;
    console.log(`Initializing connection for game: ${gameId}`);

    return new Observable(observer => {
      // Set timeout for initial connection
      const connectionTimeout = timer(this.FALLBACK_DELAY).subscribe(() => {
        console.warn('WebSocket connection timeout, using polling fallback');
        this.isUsingWebSocket = false;
        observer.next(false); // Indicate fallback to polling
        observer.complete();
      });

      // Try WebSocket connection
      this.webSocketService.connect(gameId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (message) => {
          // Clear timeout on first successful message
          connectionTimeout.unsubscribe();
          
          if (!this.isUsingWebSocket) {
            console.log('WebSocket connection established successfully');
            this.isUsingWebSocket = true;
            observer.next(true); // Indicate WebSocket success
            observer.complete();
          }
          
          this.handleWebSocketMessage(message);
        },
        error: (error) => {
          console.error('WebSocket connection failed:', error);
          connectionTimeout.unsubscribe();
          this.isUsingWebSocket = false;
          observer.next(false); // Indicate fallback to polling
          observer.complete();
        }
      });

      // Monitor connection status changes
      this.connectionStatus$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(status => {
        switch (status) {
          case ConnectionStatus.CONNECTED:
            if (!this.isUsingWebSocket) {
              console.log('WebSocket reconnected, switching from polling');
              this.isUsingWebSocket = true;
              this.requestFullSync(); // Sync state after reconnection
            }
            break;
            
          case ConnectionStatus.ERROR:
          case ConnectionStatus.DISCONNECTED:
            if (this.isUsingWebSocket) {
              console.warn('WebSocket disconnected, may need to fallback to polling');
              this.isUsingWebSocket = false;
            }
            break;
        }
      });
    });
  }

  /**
   * Send a move through WebSocket with fallback confirmation via HTTP
   */
  sendMove(moveData: any): Observable<boolean> {
    if (!this.currentGameId) {
      return throwError(() => new Error('No active game'));
    }

    const moveId = this.generateMoveId();
    this.pendingMoves.set(moveId, { ...moveData, timestamp: Date.now() });

    if (this.isUsingWebSocket && this.webSocketService.isConnected()) {
      console.log('Sending move via WebSocket:', moveData);
      
      // Send via WebSocket
      this.webSocketService.send({
        type: WS_MESSAGE_TYPES.MOVE,
        gameId: this.currentGameId,
        data: { ...moveData, moveId }
      });

      // Wait for confirmation or timeout
      return this.waitForMoveConfirmation(moveId).pipe(
        timeout(this.MESSAGE_TIMEOUT),
        catchError(error => {
          console.warn('WebSocket move confirmation timeout, falling back to HTTP');
          this.pendingMoves.delete(moveId);
          return this.sendMoveViaHttp(moveData);
        })
      );
    } else {
      // Direct HTTP fallback
      console.log('Sending move via HTTP (WebSocket not available)');
      return this.sendMoveViaHttp(moveData);
    }
  }

  /**
   * Send chat message via WebSocket
   */
  sendChatMessage(message: string): void {
    if (!this.currentGameId) {
      console.error('Cannot send chat: no active game');
      return;
    }

    if (this.isUsingWebSocket && this.webSocketService.isConnected()) {
      this.webSocketService.send({
        type: WS_MESSAGE_TYPES.CHAT,
        gameId: this.currentGameId,
        data: { text: message }
      });
    } else {
      console.warn('Chat message not sent: WebSocket not available');
      // Could implement HTTP fallback for chat if needed
    }
  }

  /**
   * Request game restart via WebSocket
   */
  requestRestart(): void {
    if (!this.currentGameId) {
      console.error('Cannot request restart: no active game');
      return;
    }

    if (this.isUsingWebSocket && this.webSocketService.isConnected()) {
      this.webSocketService.send({
        type: WS_MESSAGE_TYPES.RESTART_REQUEST,
        gameId: this.currentGameId
      });
    } else {
      console.warn('Restart request not sent: WebSocket not available');
      // HTTP fallback could be implemented here
    }
  }

  /**
   * Request full game synchronization
   */
  requestFullSync(): void {
    if (!this.currentGameId) return;

    if (this.isUsingWebSocket && this.webSocketService.isConnected()) {
      this.webSocketService.send({
        type: WS_MESSAGE_TYPES.SYNC_REQUEST,
        gameId: this.currentGameId
      });
    }
  }

  /**
   * Get current connection method
   */
  isUsingWebSocketConnection(): boolean {
    return this.isUsingWebSocket && this.webSocketService.isConnected();
  }

  /**
   * Get current game state (for polling fallback)
   */
  getCurrentGameState(): GameUpdateData | null {
    return this.gameUpdateSubject$.value;
  }

  /**
   * Update game state manually (for polling integration)
   */
  updateGameState(gameData: GameUpdateData): void {
    console.log('Manually updating game state:', gameData);
    this.gameUpdateSubject$.next(gameData);
    this.lastSyncTime = Date.now();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('Disconnecting WebSocket game service');
    this.webSocketService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
    this.currentGameId = null;
    this.isUsingWebSocket = false;
    this.pendingMoves.clear();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    console.log('Handling WebSocket message:', message.type, message.data);

    switch (message.type) {
      case WS_MESSAGE_TYPES.GAME_UPDATE:
      case WS_MESSAGE_TYPES.FULL_SYNC:
        if (message.data) {
          this.gameUpdateSubject$.next(message.data as GameUpdateData);
          this.lastSyncTime = Date.now();
          
          // Check if this confirms a pending move
          this.checkPendingMoveConfirmation(message.data);
        }
        break;

      case WS_MESSAGE_TYPES.CHAT_MESSAGE:
        if (message.data) {
          this.chatMessageSubject$.next(message.data as ChatMessageData);
        }
        break;

      case WS_MESSAGE_TYPES.RESTART_STATUS_UPDATE:
        if (message.data) {
          this.restartStatusSubject$.next(message.data as RestartStatusData);
        }
        break;

      case WS_MESSAGE_TYPES.GAME_RESET:
        this.gameResetSubject$.next();
        // Clear any pending moves on game reset
        this.pendingMoves.clear();
        break;

      case WS_MESSAGE_TYPES.PLAYER_JOINED:
        if (message.data) {
          this.playerJoinedSubject$.next({
            playerId: message.playerId || '',
            playerNickname: message.playerNickname || 'Unknown'
          });
        }
        break;

      case WS_MESSAGE_TYPES.PLAYER_LEFT:
        if (message.data) {
          this.playerLeftSubject$.next({
            playerId: message.playerId || '',
            playerNickname: message.playerNickname || 'Unknown'
          });
        }
        break;

      case WS_MESSAGE_TYPES.ERROR:
        const errorMessage = message.errorMessage || 'Unknown WebSocket error';
        console.error('WebSocket error:', errorMessage);
        this.errorSubject$.next(errorMessage);
        break;

      case WS_MESSAGE_TYPES.HEARTBEAT_RESPONSE:
        // Heartbeat acknowledgment - connection is healthy
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Wait for move confirmation from server
   */
  private waitForMoveConfirmation(moveId: string): Observable<boolean> {
    return new Observable(observer => {
      const checkInterval = setInterval(() => {
        if (!this.pendingMoves.has(moveId)) {
          clearInterval(checkInterval);
          observer.next(true);
          observer.complete();
        }
      }, 100);

      // Cleanup function
      return () => {
        clearInterval(checkInterval);
      };
    });
  }

  /**
   * Check if incoming game update confirms a pending move
   */
  private checkPendingMoveConfirmation(gameData: any): void {
    // Simple heuristic: if game state changed significantly, assume move was processed
    const currentState = this.gameUpdateSubject$.value;
    
    if (currentState && gameData) {
      // Check if turn changed or pieces count changed
      const turnChanged = currentState.turno !== gameData.turno;
      const piecesChanged = 
        currentState.pedineW !== gameData.pedineW || 
        currentState.pedineB !== gameData.pedineB ||
        currentState.damaW !== gameData.damaW ||
        currentState.damaB !== gameData.damaB;

      if (turnChanged || piecesChanged) {
        // Clear all pending moves as the game state has advanced
        console.log('Game state changed, clearing pending moves');
        this.pendingMoves.clear();
      }
    }
  }

  /**
   * HTTP fallback for sending moves
   */
  private sendMoveViaHttp(moveData: any): Observable<boolean> {
    const url = `/api/game/${this.currentGameId}/move`; // Adjust URL as needed
    
    return new Observable(observer => {
      this.http.post(url, moveData).subscribe({
        next: (response) => {
          console.log('Move sent successfully via HTTP:', response);
          observer.next(true);
          observer.complete();
        },
        error: (error) => {
          console.error('HTTP move failed:', error);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Generate unique move ID for tracking
   */
  private generateMoveId(): string {
    return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if WebSocket is responsive (for health monitoring)
   */
  isWebSocketHealthy(): boolean {
    if (!this.isUsingWebSocket) return false;
    
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    const maxHealthyDelay = 60000; // 1 minute
    
    return this.webSocketService.isConnected() && timeSinceLastSync < maxHealthyDelay;
  }

  /**
   * Force reconnection attempt
   */
  forceReconnect(): void {
    console.log('Forcing WebSocket reconnection...');
    this.webSocketService.forceReconnect();
  }

  /**
   * Get connection statistics for debugging
   */
  getConnectionInfo(): any {
    return {
      gameId: this.currentGameId,
      usingWebSocket: this.isUsingWebSocket,
      wsConnected: this.webSocketService.isConnected(),
      wsStatus: this.webSocketService.getConnectionStatus(),
      lastSyncTime: this.lastSyncTime,
      pendingMoves: this.pendingMoves.size,
      isHealthy: this.isWebSocketHealthy()
    };
  }
}