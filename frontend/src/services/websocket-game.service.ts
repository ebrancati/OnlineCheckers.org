import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { WebSocketService, WebSocketMessage, ConnectionStatus } from './websocket.service';

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
  public connectionStatus$!: Observable<ConnectionStatus>; // Initialize in constructor

  // Fallback mechanism
  private pendingMoves = new Map<string, any>(); // Track moves awaiting confirmation
  private moveTimeouts = new Map<string, any>(); // Track move timeouts
  private readonly MOVE_TIMEOUT = 5000; // 5 seconds timeout for moves

  constructor(private webSocketService: WebSocketService) {
    // Initialize connection status observable
    this.connectionStatus$ = this.webSocketService.connectionStatus$;
    
    // Initialize message subscription after service is injected
    this.initializeMessageHandling();
  }

  /**
   * Initialize WebSocket message handling
   */
  private initializeMessageHandling(): void {
    // Subscribe to all WebSocket messages and route them
    this.webSocketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => this.handleIncomingMessage(message));
  }

  /**
   * Connect to a game room
   */
  connectToGame(gameId: string): Observable<GameUpdateData | null> {
    this.currentGameId = gameId;
    
    // Connect to WebSocket
    this.webSocketService.connect(gameId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    return this.gameUpdate$;
  }

  /**
   * Disconnect from current game
   */
  disconnect(): void {
    this.webSocketService.disconnect();
    this.currentGameId = null;
    this.destroy$.next();
  }

  /**
   * Send a move with fallback mechanism
   */
  sendMove(from: string, to: string, player: string, path?: string[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const moveId = `${Date.now()}_${Math.random()}`;
      const moveData = { from, to, player, path };

      // Store pending move
      this.pendingMoves.set(moveId, { moveData, resolve, reject });

      // Send via WebSocket
      const message: WebSocketMessage = {
        type: WS_MESSAGE_TYPES.MOVE,
        gameId: this.currentGameId!,
        data: { ...moveData, moveId }
      };

      if (this.webSocketService.isConnected()) {
        this.webSocketService.send(message);
        
        // Set timeout for fallback
        const timeout = setTimeout(() => {
          if (this.pendingMoves.has(moveId)) {
            console.warn('Move timeout, attempting REST fallback for move:', moveData);
            this.handleMoveFallback(moveId, moveData);
          }
        }, this.MOVE_TIMEOUT);
        
        this.moveTimeouts.set(moveId, timeout);
      } else {
        // WebSocket not connected, use fallback immediately
        setTimeout(() => this.handleMoveFallback(moveId, moveData), 100);
      }
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(text: string): void {
    const message: WebSocketMessage = {
      type: WS_MESSAGE_TYPES.CHAT,
      gameId: this.currentGameId!,
      data: { text }
    };

    if (this.webSocketService.isConnected()) {
      this.webSocketService.send(message);
    } else {
      console.warn('Cannot send chat message: WebSocket not connected');
      // Chat is not critical, so we don't implement REST fallback
    }
  }

  /**
   * Request game restart
   */
  requestRestart(): void {
    const message: WebSocketMessage = {
      type: WS_MESSAGE_TYPES.RESTART_REQUEST,
      gameId: this.currentGameId!,
      data: {}
    };

    if (this.webSocketService.isConnected()) {
      this.webSocketService.send(message);
    } else {
      console.warn('Cannot send restart request: WebSocket not connected');
      // Could implement REST fallback here if needed
    }
  }

  /**
   * Request full game synchronization
   */
  requestSync(): void {
    if (this.webSocketService.isConnected()) {
      this.webSocketService.requestSync();
    } else {
      console.warn('Cannot request sync: WebSocket not connected');
      // This would trigger REST fallback in the calling component
    }
  }

  /**
   * Get current game state (latest received)
   */
  getCurrentGameState(): GameUpdateData | null {
    return this.gameUpdateSubject$.value;
  }

  /**
   * Get current restart status (latest received)
   */
  getCurrentRestartStatus(): RestartStatusData | null {
    return this.restartStatusSubject$.value;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.webSocketService.isConnected();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(message: WebSocketMessage): void {
    if (!message.type) {
      console.warn('Received message without type:', message);
      return;
    }

    switch (message.type) {
      case WS_MESSAGE_TYPES.GAME_UPDATE:
      case WS_MESSAGE_TYPES.FULL_SYNC:
        this.handleGameUpdate(message);
        break;

      case WS_MESSAGE_TYPES.CHAT_MESSAGE:
        this.handleChatMessage(message);
        break;

      case WS_MESSAGE_TYPES.RESTART_STATUS_UPDATE:
        this.handleRestartStatusUpdate(message);
        break;

      case WS_MESSAGE_TYPES.GAME_RESET:
        this.handleGameReset(message);
        break;

      case WS_MESSAGE_TYPES.PLAYER_JOINED:
        this.handlePlayerJoined(message);
        break;

      case WS_MESSAGE_TYPES.PLAYER_LEFT:
        this.handlePlayerLeft(message);
        break;

      case WS_MESSAGE_TYPES.ERROR:
        this.handleError(message);
        break;

      default:
        console.log('Unhandled message type:', message.type, message);
    }
  }

  /**
   * Handle game update messages
   */
  private handleGameUpdate(message: WebSocketMessage): void {
    if (message.data) {
      const gameData = message.data as GameUpdateData;
      this.gameUpdateSubject$.next(gameData);
      
      // Check if this confirms a pending move
      this.checkPendingMoveConfirmation(gameData);
    }
  }

  /**
   * Handle chat messages
   */
  private handleChatMessage(message: WebSocketMessage): void {
    if (message.data) {
      const chatData = message.data as ChatMessageData;
      this.chatMessageSubject$.next(chatData);
    }
  }

  /**
   * Handle restart status updates
   */
  private handleRestartStatusUpdate(message: WebSocketMessage): void {
    if (message.data) {
      const restartData = message.data as RestartStatusData;
      this.restartStatusSubject$.next(restartData);
    }
  }

  /**
   * Handle game reset
   */
  private handleGameReset(message: WebSocketMessage): void {
    this.gameResetSubject$.next();
  }

  /**
   * Handle player joined
   */
  private handlePlayerJoined(message: WebSocketMessage): void {
    if (message.data) {
      this.playerJoinedSubject$.next({
        playerId: message.data.playerId,
        playerNickname: message.data.playerNickname
      });
    }
  }

  /**
   * Handle player left
   */
  private handlePlayerLeft(message: WebSocketMessage): void {
    if (message.data) {
      this.playerLeftSubject$.next({
        playerId: message.data.playerId,
        playerNickname: message.data.playerNickname
      });
    }
  }

  /**
   * Handle error messages
   */
  private handleError(message: WebSocketMessage): void {
    const errorMsg = message.errorMessage || 'Unknown WebSocket error';
    console.error('WebSocket error:', errorMsg);
    this.errorSubject$.next(errorMsg);
  }

  /**
   * Check if received game update confirms a pending move
   */
  private checkPendingMoveConfirmation(gameData: GameUpdateData): void {
    // Simple heuristic: if we received a game update and have pending moves,
    // consider the oldest move as confirmed
    if (this.pendingMoves.size > 0) {
      const oldestMoveId = Array.from(this.pendingMoves.keys())[0];
      this.confirmMove(oldestMoveId, true);
    }
  }

  /**
   * Confirm a pending move (success or failure)
   */
  private confirmMove(moveId: string, success: boolean): void {
    const pendingMove = this.pendingMoves.get(moveId);
    if (pendingMove) {
      const timeout = this.moveTimeouts.get(moveId);
      if (timeout) {
        clearTimeout(timeout);
        this.moveTimeouts.delete(moveId);
      }
      
      this.pendingMoves.delete(moveId);
      
      if (success) {
        pendingMove.resolve(true);
      } else {
        pendingMove.reject(new Error('Move failed'));
      }
    }
  }

  /**
   * Handle move fallback to REST API
   */
  private handleMoveFallback(moveId: string, moveData: any): void {
    const pendingMove = this.pendingMoves.get(moveId);
    if (!pendingMove) return;

    console.log('Executing REST fallback for move:', moveData);

    // This would be implemented by injecting the HTTP service
    // For now, we'll simulate the fallback
    import('../services/move-service.service').then(({ MoveServiceService }) => {
      // You would inject this service properly in a real implementation
      // This is just to show the pattern
      console.log('Would execute REST fallback here with MoveServiceService');
      
      // Simulate REST call
      timer(1000).subscribe(() => {
        // Simulate success/failure
        const success = Math.random() > 0.1; // 90% success rate
        this.confirmMove(moveId, success);
        
        if (success) {
          // Would need to manually update game state from REST response
          console.log('REST fallback succeeded for move:', moveData);
        } else {
          console.error('REST fallback failed for move:', moveData);
        }
      });
    });
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}