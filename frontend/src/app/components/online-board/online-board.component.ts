import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { OnlineMovesComponent as MovesComponent } from '../online-moves/online-moves.component';
import { ChatComponent } from '../chat/chat.component';
import { RestartService, PlayerRestartStatus } from '../../../services/restart.service';
import { WebSocketService } from '../../../services/websocket.service';
import { GameService }      from '../../../services/game.service';
import { AudioService }     from '../../../services/audio.service';
import { GameAccessDto }    from '../../../model/entities/GameAccessDto';
import { GameResponse }     from '../../../model/entities/GameResponse';
import { MoveP }            from '../../../model/entities/MoveP';

export interface PlayerDto {
  id: string;
  nickname: string;
  team: 'WHITE' | 'BLACK';
}

/**
 * Interface representing a cell on the checkers board
 */
interface Cell {
  hasPiece: boolean;
  pieceColor: 'black' | 'white' | null;
  isKing: boolean;
}

/**
 * Interface representing a move in the game
 */
interface Move {
  from: { row: number, col: number };
  to: { row: number, col: number };
  captured?: { row: number, col: number }[];
}

@Component({
  selector: 'app-online-board',
  standalone: true,
  imports: [
    NgForOf,
    NgClass,
    NgIf,
    MovesComponent,
    ChatComponent,
    TranslateModule
  ],
  templateUrl: './online-board.component.html',
  styleUrl:    './online-board.component.css',
})
export class OnlineBoardComponent implements OnInit, OnDestroy {
  private captureChainStart: { row: number; col: number } | null = null;
  private hasCalledReset = false;
  origin: string | undefined
  board: Cell[][] = [];
  highlightedCells: { row: number, col: number }[] = [];
  selectedCell: { row: number, col: number } | null = null;
  currentPlayer: 'black' | 'white' = 'white';
  playerTeam: 'WHITE' | 'BLACK' | null = null;

  whitePlayerNickname: string = 'Giocatore Bianco';
  blackPlayerNickname: string = 'Giocatore Nero';

  moves: Move[] = [];
  gameID: string = '';
  pollingSubscription: Subscription | null = null;

  piecesWithMoves: { row: number, col: number }[] = [];
  piecesWithoutMoves: { row: number, col: number }[] = [];

  gameOver: boolean = false;
  showGameOverModal: boolean = false;
  winner: 'black' | 'white' | null = null;
  whiteCount: number = 12;
  blackCount: number = 12;
  columns: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  rows: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
  nickname: string | null = localStorage.getItem('nickname');
  capturePath: string[] = [];

  // Drag and drop properties
  draggedPiece: { row: number, col: number } | null = null;
  dragOverCell: { row: number, col: number } | null = null;

  isAnimatingCapture: boolean = false;
  captureAnimationPath: { row: number, col: number }[] = [];
  captureAnimationStep: number = 0;
  captureAnimationInterval: any = null;
  lastAnimatedCaptureId: string = '';

  lastProcessedMoveCount: number = 0;

  // Stop polling when user is making multiple moves
  isCapturingMultiple: boolean = false;

  showConnectionStatus = true;
  restartStatus: PlayerRestartStatus | null = null;
  restartPollingSubscription: Subscription | null = null;
  showRestartRequestedMessage: boolean = false;
  waitingForOpponentRestart: boolean = false;
  isResetting: boolean = false;
  hasClickedRestart: boolean = false;

  // Property to track the copy status of the game link
  linkCopied: boolean = false;
  protected chatHistory: string='';

  // WebSocket subscriptions
  private gameStateSubscription: Subscription | null = null;
  private restartStatusSubscription: Subscription | null = null;
  private connectionStatusSubscription: Subscription | null = null;
  private errorSubscription: Subscription | null = null;

  userRole: 'PLAYER' | 'SPECTATOR' = 'SPECTATOR';
  isSpectator: boolean = true;
  spectatorMessage: string | undefined = undefined;
  spectatorCount: number = 0;

  // Connection status for UI
  connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  showConnectionError = false;
  connectionErrorMessage = '';

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    public router: Router,
    private audioService: AudioService,
    private restartService: RestartService,
    private webSocketService: WebSocketService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.origin = this.document.location.origin;
  }

  ngOnInit() {
    this.gameID = this.route.snapshot.paramMap.get('gameId')!;
    this.initBoard();

    // Connect to WebSocket instead of starting polling
    this.connectToWebSocket();
  }

  ngOnDestroy() {
    // Clean up WebSocket subscriptions
    this.disconnectFromWebSocket();

    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.restartPollingSubscription) {
      this.restartPollingSubscription.unsubscribe();
    }
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
    }
  }

  /**
   * Connect to WebSocket and set up subscriptions
   */
  private connectToWebSocket(): void {
    const nickname = localStorage.getItem('nickname');
    if (!nickname) {
      console.error('No nickname found in localStorage');
      return;
    }

    // Connect to WebSocket
    this.webSocketService.connect(this.gameID, nickname);

    // Subscribe to game state updates
    this.gameStateSubscription = this.webSocketService.gameState$.subscribe({
      next: (gameState) => {
        console.log('Received game state update:', gameState);
        this.handleGameStateUpdate(gameState);
      },
      error: (error) => {
        console.error('Error in game state subscription:', error);
      }
    });

    // Subscribe to restart status updates
    this.restartStatusSubscription = this.webSocketService.restartStatus$.subscribe({
      next: (restartStatus) => {
        console.log('Received restart status update:', restartStatus);
        this.handleRestartStatusUpdate(restartStatus);
      },
      error: (error) => {
        console.error('Error in restart status subscription:', error);
      }
    });

    // Subscribe to connection status
    this.connectionStatusSubscription = this.webSocketService.connectionStatus$.subscribe({
      next: (status) => {
        this.connectionStatus = status;

        if (status === 'connected') {
          setTimeout(() => {
            this.showConnectionStatus = false;
          }, 3000);
        } else {
          this.showConnectionStatus = true;
        }
      }
    });

    // Subscribe to errors
    this.errorSubscription = this.webSocketService.error$.subscribe({
      next: (error) => {
        console.error('WebSocket error:', error);
        this.showConnectionError = true;
        this.connectionErrorMessage = error.message;
        
        // Hide error after 5 seconds
        setTimeout(() => {
          this.showConnectionError = false;
        }, 5000);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  private disconnectFromWebSocket(): void {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
    if (this.restartStatusSubscription) {
      this.restartStatusSubscription.unsubscribe();
    }
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
    
    this.webSocketService.disconnect();
  }

  /**
   * Handle game state updates from WebSocket
   * Replaces the old fetchGameState method
   */
  private handleGameStateUpdate(gameState: any): void {
    // NEW: First, get the full game access info to determine user role
    this.gameService.getGameState(this.gameID).subscribe({
      next: (gameAccess: GameAccessDto) => {
        // Update user role and spectator status
        this.userRole = gameAccess.role;
        this.isSpectator = gameAccess.role === 'SPECTATOR';
        this.spectatorMessage = gameAccess.message;

        // Log for debugging
        console.log('User role:', this.userRole, 'Is spectator:', this.isSpectator);

        // Use the gameState from the parameter (WebSocket data) for real-time updates
        // but use gameAccess.gameState for role-specific logic
        this.processGameStateUpdate(gameState, gameAccess.gameState);
      },
      error: (error) => {
        console.error('Error getting game access info:', error);
        // Fallback: treat as spectator if we can't determine role
        this.userRole = 'SPECTATOR';
        this.isSpectator = true;
        this.spectatorMessage = 'Unable to determine your role in this game.';
        
        // Still process the game state update
        this.processGameStateUpdate(gameState, gameState);
      }
    });
  }

  /**
   * Process the actual game state update logic
   * Separated from handleGameStateUpdate for clarity
   */
  private processGameStateUpdate(gameState: any, authorizedGameState?: any): void {

    this.spectatorCount = gameState.spectatorCount || 0;

    if (this.gameOver && !gameState.partitaTerminata) {
      this.gameOver = false;
      this.winner = null;
      this.showGameOverModal = false;
    }

    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      const playerMatch = gameState.players.find((p: { nickname: string; }) => p.nickname === nickname);
      if (playerMatch) {
        this.playerTeam = playerMatch.team as 'WHITE' | 'BLACK';
      }
    }

    if (gameState.cronologiaMosse && Array.isArray(gameState.cronologiaMosse)) {
        console.log('Updating moves from server:', gameState.cronologiaMosse);
        this.updateMovesFromHistory(gameState.cronologiaMosse);
    }

    // Skip update if currently capturing multiple pieces
    if (this.isCapturingMultiple) {
      this.chatHistory = gameState.chat ?? '';
      return;
    }

    // Save current board state for animation comparison
    const oldBoard = JSON.parse(JSON.stringify(this.board));

    // Update chat
    this.chatHistory = gameState.chat ?? '';

    // Update player nicknames
    for (const player of gameState.players) {
      if (player.team === 'WHITE') {
        this.whitePlayerNickname = player.nickname;
      } else if (player.team === 'BLACK') {
        this.blackPlayerNickname = player.nickname;
      }
    }

    // Handle multi-capture animations
    const captureId = gameState.lastMultiCapturePath ?
                      gameState.lastMultiCapturePath.join('-') + '-' + gameState.turno :
                      '';

    if (
      gameState.lastMultiCapturePath &&
      gameState.lastMultiCapturePath.length > 1 &&
      gameState.turno === this.playerTeam &&
      captureId !== this.lastAnimatedCaptureId
    ) {
      this.lastAnimatedCaptureId = captureId;
      this.startCaptureAnimation(oldBoard, gameState.lastMultiCapturePath, () => {
        this.updateGameState(gameState);
      });
      return;
    }

    // Normal state update
    this.updateGameState(gameState);
  }

  /**
   * Handle restart status updates from WebSocket
   */
  private handleRestartStatusUpdate(restartStatus: any): void {

    this.restartStatus = restartStatus;
    
    // Check if current player has requested restart
    if (this.playerTeam === 'WHITE' && restartStatus.restartW) {
      this.waitingForOpponentRestart = true;
    }
    else if (this.playerTeam === 'BLACK' && restartStatus.restartB) {
      this.waitingForOpponentRestart = true;
    }

    // Check if both players want restart
    if (restartStatus.restartB && restartStatus.restartW && !this.isResetting) {
      this.handleBothPlayersWantRestart();
    }
  }

  /**
   * Handle when both players want to restart
   */
  private handleBothPlayersWantRestart(): void {
    this.isResetting = true;
    
    // Reset the game via WebSocket
    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      this.webSocketService.resetGame(this.gameID, nickname);
    }

    this.audioService.playMoveSound();

    // Hide game over modal and reset local state
    this.showGameOverModal = false;
    this.waitingForOpponentRestart = false;
    this.gameOver = false;
    this.winner = null;
    this.resetLocalState();

    // Reset the resetting flag after a delay
    setTimeout(() => {
      this.isResetting = false;
    }, 1000);
  }

  /**
   * Make a move via WebSocket instead of HTTP
   * Replaces the HTTP-based makeMove method
   */
  makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    
    if (this.isSpectator) {
      console.log('Spectators cannot make moves');
      return;
    }
    
    if (!this.isPlayerTurn()) return;

    const isCapture = Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2;
    const movingPiece = { ...this.board[fromRow][fromCol] };

    // Visual feedback for capture
    if (isCapture) {
      const capRow = (fromRow + toRow) / 2;
      const capCol = (fromCol + toCol) / 2;
      const capturedPiece = this.board[capRow][capCol];

      if (!capturedPiece.hasPiece || capturedPiece.pieceColor === movingPiece.pieceColor) {
        return;
      }

      this.board[capRow][capCol] = { hasPiece: false, pieceColor: null, isKing: false };
      this.audioService.playCaptureSound();
    } else {
      this.audioService.playMoveSound();
    }

    // Move piece locally for immediate feedback
    this.board[fromRow][fromCol] = { hasPiece: false, pieceColor: null, isKing: false };

    // Check promotion
    let becomesKing = false;
    if (!movingPiece.isKing) {
      if ((movingPiece.pieceColor === 'white' && toRow === 0) ||
          (movingPiece.pieceColor === 'black' && toRow === 7)) {
        movingPiece.isKing = true;
        becomesKing = true;
        this.audioService.playKingSound();
      }
    }

    this.board[toRow][toCol] = { ...movingPiece };

    // Check for additional captures
    const further = this.getCapturesForPiece(toRow, toCol);

    if (isCapture && further.length > 0) {
      // Multiple capture sequence
      if (!this.captureChainStart) {
        this.captureChainStart = { row: fromRow, col: fromCol };
        this.isCapturingMultiple = true;
      }

      if (!this.capturePath) this.capturePath = [];
      this.capturePath.push(`${toRow}${toCol}`);

      this.selectedCell = { row: toRow, col: toCol };
      this.highlightedCells = further.map(m => m.to);
      this.resetMoveIndicators();
      this.piecesWithMoves.push({ row: toRow, col: toCol });

    } else {
      // Send move to server via WebSocket
      const start = this.captureChainStart || { row: fromRow, col: fromCol };

      if (isCapture && this.captureChainStart) {
        this.capturePath.push(`${toRow}${toCol}`);
      }

      // Send via WebSocket instead of HTTP
      const nickname = localStorage.getItem('nickname');
      if (nickname) {
        const moveData: MoveP = {
          from: `${start.row}${start.col}`,
          to: `${toRow}${toCol}`,
          player: movingPiece.pieceColor!,
          path: (this.captureChainStart && this.capturePath && this.capturePath.length > 0) ? this.capturePath : undefined
        };

        this.webSocketService.makeMove(this.gameID, nickname, moveData);
      }

      // Reset capture state
      this.captureChainStart = null;
      this.selectedCell = null;
      this.highlightedCells = [];
      this.isCapturingMultiple = false;
      this.capturePath = [];
      this.resetMoveIndicators();

      // Change turn locally (will be confirmed by server)
      this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
      this.checkGameOver();
    }
  }

  /**
   * Request restart via WebSocket
   */
  requestRestart(): void {

    if (this.isSpectator) {
      console.log('Spectators cannot request restart');
      return;
    }

    this.hasClickedRestart = true;
    
    if (!this.restartStatus) {
      console.error('Cannot request restart: restart status not available');
      return;
    }
    
    const updatedStatus = {
      gameID: this.restartStatus.gameID,
      nicknameB: this.restartStatus.nicknameB,
      nicknameW: this.restartStatus.nicknameW,
      restartB: this.playerTeam === 'BLACK' ? true : this.restartStatus.restartB,
      restartW: this.playerTeam === 'WHITE' ? true : this.restartStatus.restartW
    };
    
    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      this.webSocketService.updateRestartStatus(this.gameID, nickname, updatedStatus);
    }
    
    this.waitingForOpponentRestart = true;
    this.showRestartRequestedMessage = true;
  }

  /**
   * Cancel restart request via WebSocket
   */
  cancelRestartRequest(): void {

    if (this.isSpectator) {
      console.log('Spectators cannot cancel restart requests');
      return;
    }

    if (!this.gameID || !this.restartStatus || !this.waitingForOpponentRestart) return;

    const updatedStatus = { ...this.restartStatus };

    if (this.playerTeam === 'WHITE') {
      updatedStatus.restartW = false;
    } else if (this.playerTeam === 'BLACK') {
      updatedStatus.restartB = false;
    }

    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      this.webSocketService.updateRestartStatus(this.gameID, nickname, updatedStatus);
    }

    this.waitingForOpponentRestart = false;
  }

  /**
   * Handle page refresh - reconnect WebSocket
   */
  refreshConnection(): void {
    this.disconnectFromWebSocket();
    setTimeout(() => {
      this.connectToWebSocket();
    }, 1000);
  }

  /**
   * Start polling for game state updates
   */
  startPolling() {
    // Make an initial call now
    this.fetchGameState();

    // Then start polling every 2 seconds
    this.pollingSubscription = interval(2000).subscribe(() => {
      this.fetchGameState();
    });

    // Also start polling for reboot status
    this.startRestartStatusPolling();
  }

  startRestartStatusPolling() {
    if (!this.gameID || this.restartPollingSubscription) return;

    // Then start polling every 3 seconds
    this.restartPollingSubscription = interval(3000).subscribe(() => {
      this.fetchRestartStatus();
    });

    // First immediate call
    this.fetchRestartStatus();
  }

  /**
   * Fetch the current game state from the backend
   */
  fetchGameState() {
    if (!this.gameID || this.isAnimatingCapture) return;

    this.gameService.getGameState(this.gameID).subscribe({
      next: (gameAccess: GameAccessDto) => {

        const response = gameAccess.gameState;

        if (this.gameOver && !response.partitaTerminata) {
          this.gameOver = false;
          this.winner = null;
          this.showGameOverModal = false;
        }

        const nickname = localStorage.getItem('nickname');

        if (nickname) {
          // Search for the player among those in the match
          const playerMatch = response.players.find(p => p.nickname === nickname);
          if (playerMatch)
            this.playerTeam = playerMatch.team as 'WHITE' | 'BLACK';
          else
            console.log(`Nessun giocatore con nickname ${nickname} trovato nei giocatori della partita:`, response.players);
        }
        else {
          console.log('Nessun nickname trovato in localStorage');
        }

        // doing a multiple capture? Then do not update the state
        if (this.isCapturingMultiple) {
          // Update only the chat, not the board state
          this.chatHistory = response.chat ?? '';
          return;
        }

        // Save the current state of the board for comparison
        const oldBoard = JSON.parse(JSON.stringify(this.board));

        // Update chat
        this.chatHistory = response.chat ?? '';

        // Update player nicknames
        for (const player of response.players) {
          if (player.team === 'WHITE') {
            this.whitePlayerNickname = player.nickname;
          } else if (player.team === 'BLACK') {
            this.blackPlayerNickname = player.nickname;
          }
        }

        // Create a unique ID for this potential capture animation
        const captureId = response.lastMultiCapturePath ?
                          response.lastMultiCapturePath.join('-') + '-' + response.turno :
                          '';

        // If there is a multiple capture path, we haven't animated it yet and the turn has changed
        if (
          response.lastMultiCapturePath             &&
          response.lastMultiCapturePath.length > 1  &&
          response.turno === this.playerTeam        &&
          captureId !== this.lastAnimatedCaptureId
        ) {

          // Save this ID as the last animated one
          this.lastAnimatedCaptureId = captureId;

          // Start the capture animation
          this.startCaptureAnimation(oldBoard, response.lastMultiCapturePath, () => {
            this.updateGameState(response); // Callback at end of animation: fully updates state
          });
          return;
        }

        // Otherwise, update the state normally
        this.updateGameState(response);

        // If we have move history, update moves
        if (response.cronologiaMosse && Array.isArray(response.cronologiaMosse)) {
          this.updateMovesFromHistory(response.cronologiaMosse);
        }
      },
      error: (error) => {
        console.error('Errore nel recupero dello stato del gioco:', error);
      }
    });
  }

  /**
   * Updates moves array from server move history
   * @param moveHistory - Array of move strings from server
   */
  updateMovesFromHistory(moveHistory: string[]): void {
    this.moves = [];
    let currentMoveGroup: any[] = [];
    let lastFromPos: string | null = null;

    for (const moveString of moveHistory) {
      const parts = moveString.split('-');
      if (parts.length < 3) continue;

      const fromPos = parts[0];
      const toPos = parts[1];
      const fromRow = parseInt(fromPos[0]);
      const fromCol = parseInt(fromPos[1]);
      const toRow = parseInt(toPos[0]);
      const toCol = parseInt(toPos[1]);

      const isCapture = Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2;

      // Se è una cattura multipla (stesso punto di partenza o continua dall'ultimo punto)
      if (isCapture && (fromPos === lastFromPos || (this.moves.length > 0 && fromPos === this.moves[this.moves.length - 1].to.row + '' + this.moves[this.moves.length - 1].to.col))) {
          // Aggiungi alla cattura multipla esistente
          const lastMove = this.moves[this.moves.length - 1];
          if (lastMove && lastMove.captured) {
              lastMove.captured.push({
                  row: Math.floor((fromRow + toRow) / 2),
                  col: Math.floor((fromCol + toCol) / 2)
              });
          }
          // Aggiorna destinazione finale
          lastMove.to = { row: toRow, col: toCol };
      } else {
          // Nuova mossa
          const move = {
              from: { row: fromRow, col: fromCol },
              to: { row: toRow, col: toCol },
              captured: isCapture ? [{
                  row: Math.floor((fromRow + toRow) / 2),
                  col: Math.floor((fromCol + toCol) / 2)
              }] : undefined
          };
          this.moves.push(move);
      }

      lastFromPos = fromPos;
    }
  }

  /**
   * Updates the game state based on the response from the server
   */
  updateGameState(response: GameResponse) {

    this.spectatorCount = response.spectatorCount || 0;

    // Reset move indicators
    this.resetMoveIndicators();
    
    // Save the previous state for comparison
    const oldTurn = this.currentPlayer;

    // Update the current shift
    this.currentPlayer = response.turno === 'WHITE' ? 'white' : 'black';

    // Update board
    this.updateBoardFromState(response.board);

    // Update piece counts
    const oldWhiteCount = this.whiteCount;
    const oldBlackCount = this.blackCount;
    this.whiteCount = response.pedineW + response.damaW;
    this.blackCount = response.pedineB + response.damaB;

    // Play sound when player's turn changes (means opponent made a move)
    if (oldTurn !== this.currentPlayer &&
        this.currentPlayer === (this.playerTeam === 'WHITE' ? 'white' : 'black') &&
        !this.isAnimatingCapture) {

      // Determine whether it was a capture or a normal move based on the piece count
      const totalOldCount = oldWhiteCount + oldBlackCount;
      const totalNewCount = this.whiteCount + this.blackCount;

      if (totalNewCount < totalOldCount) {
        // It was a capture (the total number of piece decreased)
        this.audioService.playCaptureSound();
      } else {
        // It was a normal move
        this.audioService.playMoveSound();
      }
    }

    // Update end game status
    this.gameOver = response.partitaTerminata;

    // Show the end game modal to both winner and loser
    if (this.gameOver && response.vincitore !== 'NONE') {
      // Convert the winner from the backend format (WHITE/BLACK) to the frontend format (white/black)
      this.winner = response.vincitore === 'WHITE' ? 'white' : 'black';

      // Play the appropriate sound
      if (this.playerTeam === response.vincitore) {
        this.audioService.playWinSound();
      } else {
        this.audioService.playLoseSound();
      }

      // Always show the end game modal, regardless of who won
      this.showGameOverModal = true;

      // If polling is active, we stop it at the end of the game
      if (this.pollingSubscription) {
        this.pollingSubscription.unsubscribe();
        this.pollingSubscription = null;
      }
    }
  }

  /**
   * Updates the board based on the state received from the server
   */
  updateBoardFromState(boardState: string[][]) {
    if (!boardState || !Array.isArray(boardState)) return;

    this.board = boardState.map(row =>
      row.map(cell => ({
        hasPiece: cell !== '',
        pieceColor: cell === 'b' || cell === 'B' ? 'black' : cell === 'w' || cell === 'W' ? 'white' : null,
        isKing: cell === 'B' || cell === 'W'
      }))
    );
  }

  /**
   * Check if it's the current player's turn
   */
  isPlayerTurn(): boolean {
    // Spectators cannot play
    if (this.isSpectator) return false;

    // If we don't have a role yet, it's not our turn
    if (!this.playerTeam) return false;

    // If an opponent is missing, it's not time to play yet
    if (this.needsOpponent()) return false;

    // Check if it's our turn based on the color
    const isPlayerTurn =  (this.playerTeam === 'WHITE' && this.currentPlayer === 'white') ||
                          (this.playerTeam === 'BLACK' && this.currentPlayer === 'black');

    return isPlayerTurn;
  }
  
  /**
   * Initialize the game board with pieces in starting positions
   */
  initBoard() {
    const initialData = [
      [ "", "b", "", "b", "", "b", "", "b" ],
      [ "b", "", "b", "", "b", "", "b", "" ],
      [ "", "b", "", "b", "", "b", "", "b" ],
      [ "",  "",  "",  "",  "",  "",  "",  "" ],
      [ "",  "",  "",  "",  "",  "",  "",  "" ],
      [ "w", "", "w", "", "w", "", "w", "" ],
      [ "", "w", "", "w", "", "w", "", "w" ],
      [ "w", "", "w", "", "w", "", "w", "" ],
    ];
    this.board = initialData.map(row =>
      row.map(cell => ({
        hasPiece: cell === 'b' || cell === 'w',
        pieceColor: cell === 'b' ? 'black' : cell === 'w' ? 'white' : null,
        isKing: false
      }))
    );

    this.currentPlayer = 'white'; // initial turn
    this.moves = []; // store move history
    this.gameOver = false; // game not finished
    this.showGameOverModal = false; // hide end game modal
    this.winner = null;
    this.highlightedCells = []; // clears highlighted cells on the board
    this.selectedCell = null; // no piece is selected
  }

  /**
   * Determines if a cell should be colored light
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell should be light colored
   */
  isLight(row: number, col: number): boolean {
    return (row + col) % 2 === 0;
  }

  /**
   * Determines if a cell should be highlighted as a possible move
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell is a possible move
   */
  isHighlight(row: number, col: number): boolean {
    return this.highlightedCells.some(cell => cell.row === row && cell.col === col);
  }

  /**
   * Determines if a cell is currently selected
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell is currently selected
   */
  isSelected(row: number, col: number): boolean {
    return this.selectedCell?.row === row && this.selectedCell?.col === col;
  }

  /**
   * Handles click events on board cells
   * @param row - Row index of the clicked cell
   * @param col - Column index of the clicked cell
   */
  onCellClick(row: number, col: number): void {
    if (this.gameOver) return;

    // Block spectators from clicking
    if (this.isSpectator) {
      console.log('Spectators cannot interact with the board');
      return;
    }

    // Check if it's the player's turn
    if (!this.isPlayerTurn()) return;

    const cell = this.board[row][col];

    // If a highlighted cell is clicked, it means making a move
    if (this.isHighlight(row, col) && this.selectedCell) {
      // Reset indicators before making move
      this.resetMoveIndicators();
      
      this.makeMove(this.selectedCell.row, this.selectedCell.col, row, col);
      return;
    }

    // Clear previous highlights if clicking on a new cell
    this.highlightedCells = [];
    
    // Reset any previous move indicators
    this.resetMoveIndicators();

    // If the cell has no piece or it's not the current player's piece, do nothing
    if (!cell.hasPiece || cell.pieceColor !== this.currentPlayer) {
      this.selectedCell = null;
      return;
    }

    this.selectedCell = { row, col };

    // Get and show all possible moves
    const validMoves = this.getValidMoves(row, col);
    this.highlightedCells = validMoves;
    
    // Check if this piece has moves or not
    if (validMoves.length > 0) {
      // Add the clicked piece with moves to the list
      this.piecesWithMoves.push({ row, col });
    } else {
      // Only add the clicked piece without moves to the list
      this.piecesWithoutMoves.push({ row, col });
    }
  }

  /**
   * Gets valid moves for a piece at the specified position
   * @param row - Row index of the piece
   * @param col - Column index of the piece
   * @returns Array of positions representing valid moves
   */
  getValidMoves(row: number, col: number): { row: number, col: number }[] {
    const validMoves: { row: number, col: number }[] = [];
    const cell = this.board[row][col];

    // Check if there are any forced captures first
    const allCaptures = this.getAllForcedCaptures();

    // If there are forced captures, only return those for this piece
    if (allCaptures.length > 0) {
      return allCaptures
        .filter(m => m.from.row === row && m.from.col === col)
        .map(m => m.to);
    }

    // No forced captures, so return regular moves
    const directions = cell.isKing
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] // Kings can move in all diagonal directions
      : cell.pieceColor === 'white' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]]; // Regular pieces move forward only

    // calculates and adds the normal (non-capturing) moves a piece can make
    directions.forEach(([dr, dc]) => {
      const r2 = row + dr;
      const c2 = col + dc;

      if (this.isValidPosition(r2, c2) && !this.board[r2][c2].hasPiece) {
        validMoves.push({ row: r2, col: c2 });
      }
    });

    return validMoves;
  }

  /**
   * Gets all possible capture moves for the current player
   * @returns Array of moves that involve capturing opponent pieces
   */
  getAllForcedCaptures(): Move[] {
    const captures: Move[] = [];

    // Scan the entire board for forced captures
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];

        // Skip empty cells or opponent's pieces
        if (!cell.hasPiece || cell.pieceColor !== this.currentPlayer) continue;

        // Get captures for this piece
        const pieceCapturesMoves = this.getCapturesForPiece(r, c);
        captures.push(...pieceCapturesMoves);
      }
    }

    return captures;
  }

  /**
   * Gets all possible capture moves for a specific piece
   * @param row - Row index of the piece
   * @param col - Column index of the piece
   * @returns Array of capture moves for the piece
   */
  getCapturesForPiece(row: number, col: number): Move[] {
    const captures: Move[] = [];
    const cell = this.board[row][col];

    if (!cell.hasPiece) return captures;

    // Define directions based on piece type
    let directions: number[][];

    if (cell.isKing) {
      // promoted piece can move and capture in all directions
      directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    } else {
      // Normal pieces can only capture forward and sideways
      // For white, forward is -1 (upwards)
      // For black, forward is +1 (downwards)
      if (cell.pieceColor === 'white') {
        directions = [[-1, -1], [-1, 1]];
      } else {
        directions = [[1, -1], [1, 1]];
      }
    }

    // Check every direction for capture opportunities
    directions.forEach(([dr, dc]) => {
      const captureRow = row + dr;
      const captureCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;

      // Check every direction for capture opportunities
      if (!this.isValidPosition(captureRow, captureCol) || !this.isValidPosition(landRow, landCol)) {
        return;
      }

      const captureCell = this.board[captureRow][captureCol];
      const landCell = this.board[landRow][landCol];

      // Check if there is an opponent's piece to capture and an empty cell to land on
      if (captureCell.hasPiece && captureCell.pieceColor !== cell.pieceColor && !landCell.hasPiece) {
        captures.push({
          from: { row, col },
          to: { row: landRow, col: landCol },
          captured: [{ row: captureRow, col: captureCol }]
        });
      }
    });

    return captures;
  }

  /**
   * Check all pieces of the current player to determine which have moves
   */
  checkAllPiecesForMoves(): void {
    // First, clear the arrays
    this.piecesWithMoves = [];
    this.piecesWithoutMoves = [];
    
    // Scan the entire board to find pieces with and without moves
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        
        // Only check the current player's pieces
        if (cell.hasPiece && cell.pieceColor === this.currentPlayer) {
          const moves = this.getValidMoves(r, c);
          
          if (moves.length > 0) {
            this.piecesWithMoves.push({ row: r, col: c });
          } else {
            this.piecesWithoutMoves.push({ row: r, col: c });
          }
        }
      }
    }
  }

  /**
   * Determines if a cell has a piece with available moves
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell has a piece with available moves
   */
  hasAvailableMoves(row: number, col: number): boolean {
    return this.piecesWithMoves.some(piece => piece.row === row && piece.col === col);
  }
  
  /**
   * Determines if a cell has a piece with no available moves
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell has a piece with no available moves
   */
  hasNoAvailableMoves(row: number, col: number): boolean {
    return this.piecesWithoutMoves.some(piece => piece.row === row && piece.col === col);
  }
  
  /**
   * Resets the move indicators
   */
  resetMoveIndicators(): void {
    this.piecesWithMoves = [];
    this.piecesWithoutMoves = [];
  }
  /**
   * Checks if the game is over and determines the winner
   */
  checkGameOver(): void {
    // Check if a player has no pieces left
    let whiteCount = 0;
    let blackCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (cell.hasPiece) {
          if (cell.pieceColor === 'white') whiteCount++;
          else blackCount++;
        }
      }
    }

    this.whiteCount = whiteCount;
    this.blackCount = blackCount;

    if (whiteCount === 0) {
      this.gameOver = true;
      this.winner = 'black'; // player black wins if player white has no pieces
      this.showGameOverModal = true;
      return;
    }

    if (blackCount === 0) {
      this.gameOver = true;
      this.winner = 'white'; // player white wins if player black has no pieces
      this.showGameOverModal = true;
      return;
    }

    // Check if current player has valid moves
    let hasValidMoves = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (cell.hasPiece && cell.pieceColor === this.currentPlayer) {
          const moves = this.getValidMoves(r, c);
          if (moves.length > 0) {
            // Player has at least one valid move
            hasValidMoves = true;
            break;
          }
        }
      }
      if (hasValidMoves) break;
    }

    // If current player has no valid moves, they lose
    if (!hasValidMoves) {
      this.gameOver = true;
      this.winner = this.currentPlayer === 'white' ? 'black' : 'white';
      this.showGameOverModal = true;
    }
  }

  /**
   * Hides the game over modal
   */
  hideGameOverModal(): void {
    this.showGameOverModal = false;
  }

  /**
  * Checks if the game needs a second player
  * @returns true if a player is missing, false if both players are present
  */
  needsOpponent(): boolean {
    // The game needs an opponent if it has less than 2 players
    return !this.whitePlayerNickname || !this.blackPlayerNickname ||
          this.whitePlayerNickname === 'Giocatore Bianco' ||
          this.blackPlayerNickname === 'Giocatore Nero';
  }

  /**
  * Copy text to clipboard
  * @param inputElement Input element containing text to copy
  */
  copyToClipboard(inputElement: HTMLInputElement): void {
    inputElement.select();
    inputElement.setSelectionRange(0, 99999); // For mobile devices

    document.execCommand('copy');

    // Deselect the text
    inputElement.blur();

    // Show confirmation message
    this.linkCopied = true;

    // Hide message after 2 seconds
    setTimeout(() => {
      this.linkCopied = false;
    }, 2000);
  }

  /**
   * Checks if a position is within the board boundaries
   * @param row - Row index to check
   * @param col - Column index to check
   * @returns True if the position is valid
   */
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  /**
   * Handles the start of a drag operation
   * @param event - The drag event
   * @param row - Row index of the dragged piece
   * @param col - Column index of the dragged piece
   */
  onDragStart(event: DragEvent, row: number, col: number): void {

    if (this.gameOver || !this.isPlayerTurn() || this.isSpectator) {
      event.preventDefault();
      return;
    }

    const cell = this.board[row][col];

    // Only allow dragging the current player's pieces
    if (!cell.hasPiece || cell.pieceColor !== this.currentPlayer) {
      event.preventDefault();
      return;
    }

    // Store the dragged piece position
    this.draggedPiece = { row, col };

    // Set the drag image (optional)
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', `${row},${col}`);
      event.dataTransfer.effectAllowed = 'move';
    }

    // Select the piece and show valid moves
    this.selectedCell = { row, col };
    this.highlightedCells = this.getValidMoves(row, col);
  }

  /**
   * Handles the end of a drag operation
   * @param event - The drag event
   */
  onDragEnd(event: DragEvent): void {

    if (this.isSpectator) return;
    
    // Reset drag state if no drop occurred
    this.draggedPiece = null;
    this.dragOverCell = null;
  }

  /**
   * Handles dragging over a potential drop target
   * @param event - The drag event
   * @param row - Row index of the target cell
   * @param col - Column index of the target cell
   */
  onDragOver(event: DragEvent, row: number, col: number): void {

    if (this.isSpectator) return;

    // Prevent default to allow drop
    if (this.isHighlight(row, col)) {
      event.preventDefault();

      // Add drag-over class for visual feedback
      const element = event.currentTarget as HTMLElement;
      element.classList.add('drag-over');

      this.dragOverCell = { row, col };
    }
  }

  /**
   * Handles dropping a piece on a target cell
   * @param event - The drag event
   * @param row - Row index of the target cell
   * @param col - Column index of the target cell
   */
  onDrop(event: DragEvent, row: number, col: number): void {

    if (this.isSpectator) return

    event.preventDefault();

    // Remove drag-over class
    const element = event.currentTarget as HTMLElement;
    element.classList.remove('drag-over');

    // Check if this is a valid drop target
    if (this.draggedPiece && this.isHighlight(row, col)) {
      // Make the move
      this.makeMove(this.draggedPiece.row, this.draggedPiece.col, row, col);
    }

    // Reset drag state
    this.draggedPiece = null;
    this.dragOverCell = null;
  }

  // Method to start the capture animation
  startCaptureAnimation(oldBoard: Cell[][], path: string[], onComplete: () => void) {

    // Stop any ongoing animations
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }

    this.isAnimatingCapture = true;
    this.captureAnimationPath = path.map(pos => ({
      row: parseInt(pos[0]),
      col: parseInt(pos[1])
    }));
    this.captureAnimationStep = 0;

    // Copy the original board to use for animation
    this.board = JSON.parse(JSON.stringify(oldBoard));

    // Identify the piece that is capturing
    const startRow = this.captureAnimationPath[0].row;
    const startCol = this.captureAnimationPath[0].col;
    const piece = { ...this.board[startRow][startCol] }; // Create a copy of the piece

    if (!piece.hasPiece) {
      console.error("Error: No piece found at the starting position of the animation!");
      this.isAnimatingCapture = false;
      onComplete();
      return;
    }

    // Interval for animation (move the piece every 500ms)
    this.captureAnimationInterval = setInterval(() => {
      if (this.captureAnimationStep < this.captureAnimationPath.length - 1) {

        // Current position
        const current = this.captureAnimationPath[this.captureAnimationStep];

        // Next position
        const next = this.captureAnimationPath[this.captureAnimationStep + 1];

        // Calculate the position of the captured piece
        const capturedRow = (current.row + next.row) / 2;
        const capturedCol = (current.col + next.col) / 2;

        // Removes the piece from the current position
        this.board[current.row][current.col] = {
          hasPiece: false,
          pieceColor: null,
          isKing: false
        };

        // Removes the captured piece
        this.board[capturedRow][capturedCol] = {
          hasPiece: false,
          pieceColor: null,
          isKing: false
        };

        // Check if the piece has been promoted
        let becameKing = false;
        if (!piece.isKing) {
          if (
            (piece.pieceColor === 'white' && next.row === 0) ||
            (piece.pieceColor === 'black' && next.row === 7)
          ) {
            // piece promoted
            piece.isKing = true;
            becameKing = true;

            this.audioService.playKingSound();
          }
        }

        // Move the piece to the new position
        this.board[next.row][next.col] = {
          hasPiece: true,
          pieceColor: piece.pieceColor,
          isKing: piece.isKing
        };

        // Force an interface update immediately
        // if the piece has been promoted, so as to show the crown
        if (becameKing) {
          // Create a copy of the board to force Angular to detect the change
          this.board = [...this.board.map(row => [...row])];
        }

        this.audioService.playCaptureSound();

        this.captureAnimationStep++;
      } else {
        // End of animation
        clearInterval(this.captureAnimationInterval);
        this.captureAnimationInterval = null;
        this.isAnimatingCapture = false;

        // Callback to complete the update
        onComplete();
      }
    }, 500); // 500ms delay between each animation step
  }

  /**
  * Method to retrieve the restart status
  */
  fetchRestartStatus() {
    if (!this.gameID) return;

    if (this.isResetting) return;

    this.restartService.getRestartStatus(this.gameID).subscribe({
        next: (status) => {
          this.restartStatus = status;

          const myRestartFlag = this.playerTeam === 'WHITE' ? status.restartW : status.restartB;
          const opponentRestartFlag = this.playerTeam === 'WHITE' ? status.restartB : status.restartW;
          
          if (opponentRestartFlag && !myRestartFlag && this.hasClickedRestart) {
            console.log("Inconsistency detected: opponent requested a rematch, we clicked but server did not register it");
            
            // Resend the restart request
            this.requestRestart();
            return;
          }

        // Check if the current player has requested a restart
        if (this.playerTeam === 'WHITE' && status.restartW) {
          this.waitingForOpponentRestart = true;
        }
        else if (this.playerTeam === 'BLACK' && status.restartB) {
          this.waitingForOpponentRestart = true;
        }

        // Check if both players have requested a rematch
        if (this.restartService.bothPlayersWantRestart(status) && !this.isResetting) {
          this.isResetting = true;

          // Reset the game
          this.restartService.resetGame(this.gameID).subscribe({
            next: () => {
              if (this.restartPollingSubscription) {
                this.restartPollingSubscription.unsubscribe();
              }

              this.audioService.playMoveSound();

              // Hide the end game modal
              this.showGameOverModal = false;
              this.waitingForOpponentRestart = false;

              this.gameOver = false;
              this.winner = null;
              this.resetLocalState();

              // Force an immediate update of the game state
              setTimeout(() => {
                this.isResetting = false;
                this.fetchGameState();
                this.startRestartStatusPolling();

                // delay before resetting the restart state
                setTimeout(() => {
                  this.resetStatusRestart();
                }, 2000);
              }, 1000);
            },
            error: (err) => {
              console.error('Game reset error:', err);
               this.isResetting = false;
            }
          });
        } else if (!this.gameOver && !this.isResetting) {
          // If the game has been reset by someone else, update the state
          this.fetchGameState();
        }
      },
      error: (error) => {
        console.error('Error getting restart state:', error);
      }
    });
  }

  resetStatusRestart() {
    this.restartService.resetPlayerRestart(this.gameID).subscribe(res => {
      this.waitingForOpponentRestart = false;
      this.fetchGameState();
    })
  }

  /**
  * Method to restore the local state of the game
  */
  private resetLocalState() {
    this.selectedCell = null;
    this.highlightedCells = [];
    this.moves = [];
    this.isAnimatingCapture = false;
    this.captureChainStart = null;
    this.captureAnimationPath = [];
    this.capturePath = [];
    this.lastAnimatedCaptureId = '';
    this.lastProcessedMoveCount = 0;
    this.isCapturingMultiple = false;
    this.restartPollingSubscription?.unsubscribe();
    this.restartPollingSubscription = null;
  }

  /**
  * Check if the other player has requested a restart
  */
  hasOpponentRequestedRestart(): boolean {
    if (!this.restartStatus) return false;

    if (this.playerTeam === 'WHITE') {
      return this.restartStatus.restartB;
    } else if (this.playerTeam === 'BLACK') {
      return this.restartStatus.restartW;
    }

    return false;
  }

  resetGame(): void {
    if (this.gameID) {
      this.requestRestart();
    } else {
      this.router.navigate(['/play']);
    }
  }

  protected readonly localStorage = localStorage;
}