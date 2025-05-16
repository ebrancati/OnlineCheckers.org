import { Router } from '@angular/router';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { OnlineMovesComponent as MovesComponent } from '../online-moves/online-moves.component';
import { ChatComponent } from '../chat/chat.component';
import { MoveServiceService } from '../../../services/move-service.service';
import { GameService } from '../../../services/game.service';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { MoveP } from '../../../model/entities/MoveP';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AudioService } from '../../../services/audio.service';
import { TranslateModule } from '@ngx-translate/core';
import { RestartService, PlayerRestartStatus } from '../../../services/restart.service';

export interface PlayerDto {
  id: string;
  nickname: string;
  team: 'WHITE' | 'BLACK';
}

export interface GameResponse {
  cronologiaMosse: string[];
  chat: string;
  id: string;
  board: string[][];
  turno: 'WHITE' | 'BLACK' | 'NONE';
  pedineW: number;
  pedineB: number;
  damaW: number;
  damaB: number;
  partitaTerminata: boolean;
  vincitore: 'WHITE' | 'BLACK' | 'NONE';
  players: PlayerDto[];
  lastMultiCapturePath?: string[];
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
  imports: [
    NgForOf,
    NgClass,
    NgIf,
    MovesComponent,
    ChatComponent,
    TranslateModule
  ],
  templateUrl: './online-board.component.html',
  styleUrl: './online-board.component.css',
  standalone: true
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

  // All'inizio della classe OnlineBoardComponent, con le altre proprietà
  lastProcessedMoveCount: number = 0;

  // FERMA IL POLLING QUANDO L'UTENTE STA FACENDO MOSSE MULTIPLE
  isCapturingMultiple: boolean = false;

  restartStatus: PlayerRestartStatus | null = null;
  restartPollingSubscription: Subscription | null = null;
  showRestartRequestedMessage: boolean = false;
  waitingForOpponentRestart: boolean = false;
  isResetting: boolean = false;
  hasClickedRestart: boolean = false;

  // Proprietà per tenere traccia dello stato di copia del link della partita
  linkCopied: boolean = false;
  protected chatHistory: string='';

  constructor(
    private moveService: MoveServiceService,
    private gameService: GameService,
    private route: ActivatedRoute,
    public router: Router,
    private audioService: AudioService,
    private restartService: RestartService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.origin = this.document.location.origin;
  }

  ngOnInit() {
    this.gameID = this.route.snapshot.paramMap.get('gameId')!;
    this.initBoard();

    // Inizia il polling per aggiornamenti di stato
    this.startPolling();
  }

  ngOnDestroy() {
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
   * Start polling for game state updates
   */
  startPolling() {
    // Fai subito una chiamata iniziale
    this.fetchGameState();

    // Poi inizia il polling ogni 2 secondi
    this.pollingSubscription = interval(2000).subscribe(() => {
      this.fetchGameState();
    });

    // Avvia anche il polling dello stato di riavvio
    this.startRestartStatusPolling();
  }

  startRestartStatusPolling() {
    if (!this.gameID || this.restartPollingSubscription) return;

    // Polling ogni 3 secondi
    this.restartPollingSubscription = interval(3000).subscribe(() => {
      this.fetchRestartStatus();
    });

    // Prima chiamata immediata
    this.fetchRestartStatus();
  }

  /**
   * Fetch the current game state from the backend
   */
  fetchGameState() {
    if (!this.gameID || this.isAnimatingCapture) return;

    this.gameService.getGameState(this.gameID).subscribe({
      next: (response: GameResponse) => {
        console.log("Risposta dal server:", response);

        if (this.gameOver && !response.partitaTerminata) {
          console.log("La partita è stata resettata, aggiorno lo stato locale");
          this.gameOver = false;
          this.winner = null;
          this.showGameOverModal = false;
        }

        console.log("Players nella risposta:", response.players);

        // Log del nickname attuale
        const nickname = localStorage.getItem('nickname');
        console.log('Nickname corrente in localStorage:', nickname);

        if (nickname) {
          // Cerca il giocatore tra quelli nella partita
          const playerMatch = response.players.find(p => p.nickname === nickname);
          if (playerMatch) {
            this.playerTeam = playerMatch.team as 'WHITE' | 'BLACK';
            console.log(`Trovato giocatore con nickname ${nickname}, team assegnato: ${this.playerTeam}`);
          } else {
            console.log(`Nessun giocatore con nickname ${nickname} trovato nei giocatori della partita:`, response.players);
          }
        } else {
          console.log('Nessun nickname trovato in localStorage');
        }

        // Se stiamo facendo una cattura multipla, non aggiorniamo lo stato
        if (this.isCapturingMultiple) {
          console.log("In corso cattura multipla, aggiorno solo la chat");
          // Aggiorna solo la chat, non lo stato della scacchiera
          this.chatHistory = response.chat ?? '';
          return;
        }

        // Salva lo stato attuale della scacchiera per confronto
        const oldBoard = JSON.parse(JSON.stringify(this.board));

        // Aggiorna la chat
        this.chatHistory = response.chat ?? '';

        // Aggiorna i nickname dei giocatori
        for (const player of response.players) {
          if (player.team === 'WHITE') {
            this.whitePlayerNickname = player.nickname;
          } else if (player.team === 'BLACK') {
            this.blackPlayerNickname = player.nickname;
          }
        }

        // SOLUZIONE al bug dell'animazione che si ripete
        // Crea un ID univoco per questa potenziale animazione di cattura
        const captureId = response.lastMultiCapturePath ?
                          response.lastMultiCapturePath.join('-') + '-' + response.turno :
                          '';

        // Se c'è un percorso di cattura multipla, non l'abbiamo già animato e il turno è cambiato
        if (response.lastMultiCapturePath &&
            response.lastMultiCapturePath.length > 1 &&
            response.turno === this.playerTeam &&
            captureId !== this.lastAnimatedCaptureId) {

          console.log("Rilevata nuova cattura multipla dell'avversario, avvio animazione");
          // Salva questo ID come l'ultimo animato
          this.lastAnimatedCaptureId = captureId;

          // Avvia l'animazione della cattura
          this.startCaptureAnimation(oldBoard, response.lastMultiCapturePath, () => {
            // Callback alla fine dell'animazione: aggiorna completamente lo stato
            this.updateGameState(response);
          });
          return;
        }

        // Altrimenti, aggiorna lo stato normalmente
        this.updateGameState(response);

        // Se abbiamo la cronologia mosse, aggiorna le mosse
        if (response.cronologiaMosse && Array.isArray(response.cronologiaMosse)) {
          this.updateMovesFromHistory(response.cronologiaMosse);
        }

        console.log("Stato dopo l'aggiornamento: playerTeam=", this.playerTeam, "currentPlayer=", this.currentPlayer);
        console.log("isPlayerTurn() restituisce:", this.isPlayerTurn());
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

    for (const moveString of moveHistory) {
      // Parse move string in format "fromRow,fromCol-toRow,toCol-player"
      const parts = moveString.split('-');
      if (parts.length < 3) continue; // Skip invalid format

      const fromRow = parseInt(parts[0][0]);
      const fromCol = parseInt(parts[0][1]);
      const toRow = parseInt(parts[1][0]);
      const toCol = parseInt(parts[1][1]);

      // Check if this is a capture move (distance = 2)
      const isCapture = Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2;

      // Create move object
      const move: Move = {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol }
      };

      // Add captured piece if it's a capture
      if (isCapture) {
        const capturedRow = Math.floor((fromRow + toRow) / 2);
        const capturedCol = Math.floor((fromCol + toCol) / 2);
        move.captured = [{ row: capturedRow, col: capturedCol }];
      }

      // Add the move to the moves array
      this.moves.push(move);
    }
  }

  /**
   * Updates the game state based on the response from the server
   */
  updateGameState(response: GameResponse) {
    // Reset move indicators
    this.resetMoveIndicators();
    
    // Salva lo stato precedente per confronto
    const oldBoard = this.board ? JSON.parse(JSON.stringify(this.board)) : null;
    const oldTurn = this.currentPlayer;

    // Aggiorna il turno corrente
    this.currentPlayer = response.turno === 'WHITE' ? 'white' : 'black';

    // Aggiorna la board
    this.updateBoardFromState(response.board);

    // Aggiorna conteggi pedine
    const oldWhiteCount = this.whiteCount;
    const oldBlackCount = this.blackCount;
    this.whiteCount = response.pedineW + response.damaW;
    this.blackCount = response.pedineB + response.damaB;

    // Riproduzione suono quando cambia il turno verso il giocatore (significa che l'avversario ha fatto una mossa)
    // Solo se non siamo in un'animazione di cattura (che ha già i suoi suoni)
    if (oldTurn !== this.currentPlayer &&
        this.currentPlayer === (this.playerTeam === 'WHITE' ? 'white' : 'black') &&
        !this.isAnimatingCapture) {

      // Determina se è stata una cattura o una mossa normale in base al conteggio pedine
      const totalOldCount = oldWhiteCount + oldBlackCount;
      const totalNewCount = this.whiteCount + this.blackCount;

      if (totalNewCount < totalOldCount) {
        // È stata una cattura (il numero totale di pedine è diminuito)
        this.audioService.playCaptureSound();
        console.log("Riproduco suono cattura per mossa dell'avversario");
      } else {
        // È stata una mossa normale
        this.audioService.playMoveSound();
        console.log("Riproduco suono mossa per mossa dell'avversario");
      }
    }

    // Aggiorna stato fine partita
    this.gameOver = response.partitaTerminata;

    // Mostra il modale di fine partita sia al vincitore che al perdente
    if (this.gameOver && response.vincitore !== 'NONE') {
      // Converti il vincitore dal formato del backend (WHITE/BLACK) al formato del frontend (white/black)
      this.winner = response.vincitore === 'WHITE' ? 'white' : 'black';

      // Riproduci il suono appropriato
      if (this.playerTeam === response.vincitore) {
        this.audioService.playWinSound();
      } else {
        this.audioService.playLoseSound();
      }

      // Mostra sempre il modale di fine partita, indipendentemente da chi ha vinto
      this.showGameOverModal = true;

      console.log(`Partita terminata. Vincitore: ${this.winner}. Il tuo team: ${this.playerTeam}`);

      // Se il polling è attivo, lo interrompiamo alla fine della partita
      if (this.pollingSubscription) {
        this.pollingSubscription.unsubscribe();
        this.pollingSubscription = null;
      }
    }

    console.log(`Stato aggiornato: Turno ${this.currentPlayer}, Team giocatore: ${this.playerTeam}`);
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
    // Se non abbiamo ancora un ruolo, non è il nostro turno
    if (!this.playerTeam) {
      return false;
    }

    // Se manca un avversario, non è ancora il momento di giocare
    if (this.needsOpponent()) {
      return false;
    }

    // Verifica se è il nostro turno in base al colore
    const isPlayerTurn = (this.playerTeam === 'WHITE' && this.currentPlayer === 'white') ||
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

    this.currentPlayer = 'white'; // turno iniziale
    this.moves = []; // memorizza cronologia mosse
    this.gameOver = false; // partita non terminata
    this.showGameOverModal = false; // nasconde modale di fine partita
    this.winner = null;
    this.highlightedCells = []; // pulisce celle evidenziate sulla scacchiera
    this.selectedCell = null; // nessun pezzo è selezionato
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

    // Verifica se è il turno del giocatore
    if (!this.isPlayerTurn()) {
      console.log('Non è il tuo turno! Attendi la mossa dell\'avversario.');
      return;
    }

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

    // calcola e aggiunge le mosse normali (non di cattura) che un pezzo può fare
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
    console.log(`Cercando catture per pezzo in [${row},${col}]`);
    const captures: Move[] = [];
    const cell = this.board[row][col];

    if (!cell.hasPiece) {
      console.log('La cella non contiene un pezzo');
      return captures;
    }

    console.log(`Pezzo trovato: colore=${cell.pieceColor}, re=${cell.isKing}`);

    // Definisci le direzioni in base al tipo di pezzo
    let directions: number[][];

    if (cell.isKing) {
      // Le dame possono muoversi e catturare in tutte le direzioni
      directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    } else {
      // Le pedine normali possono catturare solo in avanti e lateralmente
      // Per il bianco, avanti è -1 (verso l'alto)
      // Per il nero, avanti è +1 (verso il basso)
      if (cell.pieceColor === 'white') {
        directions = [[-1, -1], [-1, 1]]; // Solo in avanti per il bianco
      } else {
        directions = [[1, -1], [1, 1]]; // Solo in avanti per il nero
      }
    }

    // Controlla ogni direzione per opportunità di cattura
    directions.forEach(([dr, dc]) => {
      const captureRow = row + dr;
      const captureCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;

      console.log(`Verificando direzione [${dr},${dc}]: posizione cattura [${captureRow},${captureCol}], atterraggio [${landRow},${landCol}]`);

      // Assicurati che le posizioni siano valide
      if (!this.isValidPosition(captureRow, captureCol) || !this.isValidPosition(landRow, landCol)) {
        console.log('Posizioni non valide, fuori dalla scacchiera');
        return;
      }

      const captureCell = this.board[captureRow][captureCol];
      const landCell = this.board[landRow][landCol];

      console.log(`Cella da catturare: hasPiece=${captureCell.hasPiece}, colore=${captureCell.pieceColor}`);
      console.log(`Cella di atterraggio: hasPiece=${landCell.hasPiece}`);

      // Controlla se c'è un pezzo avversario da catturare e una cella vuota su cui atterrare
      if (captureCell.hasPiece && captureCell.pieceColor !== cell.pieceColor && !landCell.hasPiece) {
        console.log('Cattura trovata!');
        captures.push({
          from: { row, col },
          to: { row: landRow, col: landCol },
          captured: [{ row: captureRow, col: captureCol }]
        });
      }
    });

    console.log(`Totale catture trovate: ${captures.length}`);
    return captures;
  }

  /**
   * Executes a move from one position to another
   * @param fromRow - Starting row
   * @param fromCol - Starting column
   * @param toRow - Destination row
   * @param toCol - Destination column
   */
  makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    if (!this.isPlayerTurn()) return;

    console.log(`Esecuzione mossa da [${fromRow},${fromCol}] a [${toRow},${toCol}]`);

    const isCapture = Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2;
    console.log(`Questa è una mossa di cattura? ${isCapture}`);

    const movingPiece = { ...this.board[fromRow][fromCol] };
    console.log(`Pezzo in movimento: colore=${movingPiece.pieceColor}, re=${movingPiece.isKing}`);

    // Per le catture, rimuoviamo subito il pezzo catturato per feedback visivo
    if (isCapture) {
      const capRow = (fromRow + toRow) / 2;
      const capCol = (fromCol + toCol) / 2;
      console.log(`Rimozione pezzo catturato in [${capRow},${capCol}]`);

      const capturedPiece = this.board[capRow][capCol];
      console.log(`Pezzo catturato: colore=${capturedPiece.pieceColor}, re=${capturedPiece.isKing}`);

      // Verifica che ci sia effettivamente un pezzo da catturare
      if (!capturedPiece.hasPiece) {
        console.error('Errore: non c\'è un pezzo da catturare!');
        return;
      }

      // Verifica che sia un pezzo avversario
      if (capturedPiece.pieceColor === movingPiece.pieceColor) {
        console.error('Errore: non puoi catturare i tuoi pezzi!');
        return;
      }

      this.board[capRow][capCol] = { hasPiece: false, pieceColor: null, isKing: false };
      this.audioService.playCaptureSound();
    } else {
      this.audioService.playMoveSound();
    }

    // Sposta il pezzo
    console.log('Spostamento del pezzo');
    this.board[fromRow][fromCol] = { hasPiece: false, pieceColor: null, isKing: false };

    // IMPORTANTE: Verifica se la pedina diventa dama
    let becomesKing = false;
    if (!movingPiece.isKing) {
      if ((movingPiece.pieceColor === 'white' && toRow === 0) ||
          (movingPiece.pieceColor === 'black' && toRow === 7)) {
        movingPiece.isKing = true;
        becomesKing = true;
        this.audioService.playKingSound();
        console.log(`Pedina ${movingPiece.pieceColor} promossa a dama!`);
      }
    }

    // Aggiorna la pedina nella nuova posizione
    this.board[toRow][toCol] = { ...movingPiece };

    // Verifica ulteriori catture DOPO la promozione a dama
    const further = this.getCapturesForPiece(toRow, toCol);
    console.log(`Ulteriori catture disponibili: ${further.length}`);

    if (isCapture && further.length > 0) {
      console.log('Continuazione della catena di cattura');
      // Inizio o continua la catena di cattura
      if (!this.captureChainStart) {
        this.captureChainStart = { row: fromRow, col: fromCol };
        this.isCapturingMultiple = true;
      }

      // Aggiungi questo passo al percorso di cattura
      if (!this.capturePath) {
        this.capturePath = [];
      }
      this.capturePath.push(`${toRow}${toCol}`);
      console.log(`Percorso di cattura aggiornato: ${this.capturePath}`);

      // Aggiungi alla cronologia locale
      this.moves = [...this.moves, {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        captured: [{ row: (fromRow + toRow) / 2, col: (fromCol + toCol) / 2 }]
      }];

      this.selectedCell = { row: toRow, col: toCol };
      this.highlightedCells = further.map(m => m.to);
      
      // Reset indicators except for the current piece
      this.resetMoveIndicators();
      this.piecesWithMoves.push({ row: toRow, col: toCol });

      // Se è diventata dama, aggiorna l'interfaccia
      if (becomesKing) {
        // Forza un aggiornamento dell'interfaccia
        setTimeout(() => {
          // Questo è un trick per forzare Angular a fare change detection
          this.board = [...this.board];
        }, 100);
      }
    }
    else {
      // Fine catena o mossa semplice → invia al server
      const start = this.captureChainStart || { row: fromRow, col: fromCol };

      // Se è una mossa semplice o l'ultima cattura, aggiungi alla cronologia locale
      if (!isCapture || !this.captureChainStart) {
        this.moves = [...this.moves, {
          from: { row: fromRow, col: fromCol },
          to: { row: toRow, col: toCol },
          captured: isCapture ? [{ row: (fromRow + toRow) / 2, col: (fromCol + toCol) / 2 }] : undefined
        }];
      }

      // Per l'ultima cattura in una sequenza, aggiungi anche questa posizione al percorso
      if (isCapture && this.captureChainStart) {
        this.capturePath.push(`${toRow}${toCol}`);
      }

      // Preparazione del payload con path per il server
      const payload: MoveP = {
        from: `${start.row}${start.col}`,
        to: `${toRow}${toCol}`,
        player: movingPiece.pieceColor!
      };

      // Aggiungi il percorso se è una cattura multipla
      if (this.captureChainStart && this.capturePath && this.capturePath.length > 0) {
        payload.path = this.capturePath;
        console.log("Inviando percorso di cattura:", payload.path);
      }

      this.moveService.saveMove(payload, this.gameID).subscribe({
        next: res => {
          // Quando riceviamo la risposta dal server, aggiorniamo lo stato
          this.updateGameState(res);

          if (res && (res as any).cronologiaMosse) {
            this.updateMovesFromHistory((res as any).cronologiaMosse);
          }
        },
        error: err => console.error('Errore salvataggio mossa', err)
      });

      // Pulisci stato cattura, highlights e percorso
      this.captureChainStart = null;
      this.selectedCell = null;
      this.highlightedCells = [];
      this.isCapturingMultiple = false;
      this.capturePath = []; // Reset percorso di cattura
      
      // Reset indicators 
      this.resetMoveIndicators();

      // Cambia turno e controlla fine partita
      this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
      this.checkGameOver();
    }
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
      this.winner = 'black'; // Il nero vince se il bianco non ha pezzi
      this.showGameOverModal = true;
      return;
    }

    if (blackCount === 0) {
      this.gameOver = true;
      this.winner = 'white'; // Il bianco vince se il nero non ha pezzi
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
   * Verifica se la partita ha bisogno di un secondo giocatore
   * @returns true se manca un giocatore, false se entrambi i giocatori sono presenti
   */
  needsOpponent(): boolean {
    // La partita ha bisogno di un avversario se ha meno di 2 giocatori
    return !this.whitePlayerNickname || !this.blackPlayerNickname ||
          this.whitePlayerNickname === 'Giocatore Bianco' ||
          this.blackPlayerNickname === 'Giocatore Nero';
  }

  /**
   * Copia il testo negli appunti
   * @param inputElement Elemento input contenente il testo da copiare
   */
  copyToClipboard(inputElement: HTMLInputElement): void {
    // Seleziona il testo nell'input
    inputElement.select();
    inputElement.setSelectionRange(0, 99999); // Per dispositivi mobili

    // Esegui il comando di copia
    document.execCommand('copy');

    // Deseleziona il testo
    inputElement.blur();

    // Mostra il messaggio di conferma
    this.linkCopied = true;

    // Nascondi il messaggio dopo 2 secondi
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
   * Helper method to get the DOM element for a piece at the specified position
   * @param row - Row index of the piece
   * @param col - Column index of the piece
   * @returns The DOM element for the piece, or null if not found
   */
  private getPieceElement(row: number, col: number): HTMLElement | null {
    // Find the square element at the specified position
    const squares = document.querySelectorAll('.square');
    const index = row * 8 + col;

    if (index >= 0 && index < squares.length) {
      // Find the piece element within the square
      return squares[index].querySelector('.piece') as HTMLElement;
    }

    return null;
  }

  /**
   * Handles the start of a drag operation
   * @param event - The drag event
   * @param row - Row index of the dragged piece
   * @param col - Column index of the dragged piece
   */
  onDragStart(event: DragEvent, row: number, col: number): void {
    if (this.gameOver || !this.isPlayerTurn()) {
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

  // Metodo per avviare l'animazione della cattura
  startCaptureAnimation(oldBoard: Cell[][], path: string[], onComplete: () => void) {
    console.log('Avvio animazione cattura lungo il percorso:', path);

    // Interrompi eventuali animazioni in corso
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

    // Copia la scacchiera originale da usare per l'animazione
    this.board = JSON.parse(JSON.stringify(oldBoard));

    // Identifica il pezzo che sta catturando
    const startRow = this.captureAnimationPath[0].row;
    const startCol = this.captureAnimationPath[0].col;
    const piece = { ...this.board[startRow][startCol] }; // Crea una copia del pezzo

    if (!piece.hasPiece) {
      console.error("Errore: nessun pezzo trovato alla posizione iniziale dell'animazione!");
      this.isAnimatingCapture = false;
      onComplete();
      return;
    }

    // Intervallo per l'animazione (sposta il pezzo ogni 500ms)
    this.captureAnimationInterval = setInterval(() => {
      if (this.captureAnimationStep < this.captureAnimationPath.length - 1) {
        // Posizione corrente
        const current = this.captureAnimationPath[this.captureAnimationStep];
        // Prossima posizione
        const next = this.captureAnimationPath[this.captureAnimationStep + 1];

        // Calcola la posizione del pezzo catturato
        const capturedRow = (current.row + next.row) / 2;
        const capturedCol = (current.col + next.col) / 2;

        // Rimuove il pezzo dalla posizione corrente
        this.board[current.row][current.col] = {
          hasPiece: false,
          pieceColor: null,
          isKing: false
        };

        // Rimuove il pezzo catturato
        this.board[capturedRow][capturedCol] = {
          hasPiece: false,
          pieceColor: null,
          isKing: false
        };

        // Verifica se la pedina diventa dama
        let becameKing = false;
        if (!piece.isKing) {
          if ((piece.pieceColor === 'white' && next.row === 0) ||
              (piece.pieceColor === 'black' && next.row === 7)) {
            // La pedina diventa dama
            piece.isKing = true;
            becameKing = true;

            // Riproduci suono promozione a dama
            this.audioService.playKingSound();

            console.log(`Pedina ${piece.pieceColor} promossa a dama durante l'animazione`);
          }
        }

        // Sposta il pezzo nella nuova posizione
        this.board[next.row][next.col] = {
          hasPiece: true,
          pieceColor: piece.pieceColor,
          isKing: piece.isKing
        };

        // Forza un aggiornamento dell'interfaccia immediatamente
        // se la pedina è diventata dama, così da mostrare la corona
        if (becameKing) {
          // Creiamo una copia della scacchiera per forzare Angular a rilevare la modifica
          this.board = [...this.board.map(row => [...row])];
        }

        // Riproduci il suono di cattura
        this.audioService.playCaptureSound();

        // Avanza all'animazione successiva
        this.captureAnimationStep++;
      } else {
        // Fine dell'animazione
        clearInterval(this.captureAnimationInterval);
        this.captureAnimationInterval = null;
        this.isAnimatingCapture = false;

        // Callback per completare l'aggiornamento
        onComplete();
      }
    }, 500); // Ritardo di 500ms tra ogni passo dell'animazione
  }

  /**
   * Metodo per recuperare lo stato di riavvio
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
            console.log("Rilevata incoerenza: l'avversario ha richiesto il riavvio, noi abbiamo cliccato ma il server non l'ha registrato");
            
            // Invia di nuovo la richiesta di riavvio
            this.requestRestart();
            return;
          }

        // Controlla se il giocatore attuale ha richiesto il riavvio
        if (this.playerTeam === 'WHITE' && status.restartW) {
          this.waitingForOpponentRestart = true;
        } else if (this.playerTeam === 'BLACK' && status.restartB) {
          this.waitingForOpponentRestart = true;
        }


        // Controlla se entrambi i giocatori hanno richiesto il riavvio
        if (this.restartService.bothPlayersWantRestart(status) && !this.isResetting) {
          console.log("Entrambi i giocatori hanno richiesto il riavvio, procedo con il reset");
          this.isResetting = true;

          // Resetta la partita
          this.restartService.resetGame(this.gameID).subscribe({
            next: () => {
              if (this.restartPollingSubscription) {
                this.restartPollingSubscription.unsubscribe();
              }
              console.log("Reset della partita completato lato server");

              // Riproduci suono di reset partita
              this.audioService.playMoveSound();

              // Nascondi il modale di fine partita
              this.showGameOverModal = false;
              this.waitingForOpponentRestart = false;

              // Reimposta lo stato locale
              this.gameOver = false;
              this.winner = null;

              // Reset dello stato locale
              this.resetLocalState();

              // Forza un aggiornamento immediato dello stato della partita
              setTimeout(() => {
                console.log("Forzo l'aggiornamento della partita");
                this.isResetting = false;
                this.fetchGameState();
                this.startRestartStatusPolling();

                // Aggiungi un ulteriore ritardo prima di resettare lo stato di riavvio
                // per assicurarsi che entrambi i giocatori abbiano avuto il tempo di transizionare
                setTimeout(() => {
                  console.log("Reset dello stato di riavvio dopo la transizione");
                  this.resetStatusRestart();
                }, 2000);
              }, 1000);
            },
            error: (err) => {
              console.error('Errore nel reset della partita:', err);
               this.isResetting = false;
            }
          });
        } else if (!this.gameOver && !this.isResetting) {
          // Se la partita è stata resettata da qualcun altro, aggiorna lo stato
          this.fetchGameState();
        }
      },
      error: (error) => {
        console.error('Errore nel recupero dello stato di riavvio:', error);
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
   * Metodo per ripristinare lo stato locale della partita
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
   * Metodo per richiedere il riavvio
   */
  requestRestart() {
    // Segna che abbiamo cliccato il pulsante Rigioca
    this.hasClickedRestart = true;
    
    // Verifica che restartStatus esista
    if (!this.restartStatus) {
      console.error('Impossibile richiedere il riavvio: stato di riavvio non disponibile');
      return;
    }
    
    // Crea una copia corretta dell'oggetto, assicurandoci che tutte le proprietà siano definite
    const updatedStatus: PlayerRestartStatus = {
      gameID: this.restartStatus.gameID,
      nicknameB: this.restartStatus.nicknameB,
      nicknameW: this.restartStatus.nicknameW,
      restartB: this.playerTeam === 'BLACK' ? true : this.restartStatus.restartB,
      restartW: this.playerTeam === 'WHITE' ? true : this.restartStatus.restartW
    };
    
    this.restartService.updateRestartStatus(updatedStatus).subscribe({
      next: () => {
        this.waitingForOpponentRestart = true;
        this.showRestartRequestedMessage = true;
      },
      error: (err) => {
        console.error('Errore nell\'aggiornamento dello stato di riavvio:', err);
      }
    });
  }

  /**
   * Metodo per annullare la richiesta di riavvio
   */
  cancelRestartRequest() {
    if (!this.gameID || !this.restartStatus || !this.waitingForOpponentRestart) return;

    // Crea una copia dello stato attuale
    let updatedStatus = { ...this.restartStatus };

    // Aggiorna lo stato in base al team del giocatore
    if (this.playerTeam === 'WHITE') {
      updatedStatus.restartW = false;
    } else if (this.playerTeam === 'BLACK') {
      updatedStatus.restartB = false;
    }

    // Invia l'aggiornamento al server
    this.restartService.updateRestartStatus(updatedStatus).subscribe({
      next: () => {
        this.waitingForOpponentRestart = false;
      },
      error: (err) => {
        console.error('Errore nell\'annullamento della richiesta di riavvio:', err);
      }
    });
  }

  /**
   * Controlla se l'altro giocatore ha richiesto il riavvio
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

  /**
   * Modifica il metodo resetGame per utilizzare il nuovo meccanismo di riavvio
   */
  resetGame(): void {
    // Se la partita è online, richiedi il riavvio
    if (this.gameID) {
      this.requestRestart();
    } else {
      // Per le partite offline, semplicemente reinizializza la scacchiera
      this.router.navigate(['/play']);
    }
  }

  protected readonly localStorage = localStorage;
}
