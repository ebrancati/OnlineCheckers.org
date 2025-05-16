// src/app/components/bot-board/bot-board.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { OfflineBoardComponent } from '../offline-board/offline-board.component';
import { BotService } from '../../../services/bot.service';
import { AudioService } from '../../../services/audio.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { OfflineMovesComponent } from '../offline-moves/offline-moves.component';

@Component({
  selector: 'app-bot-board',
  templateUrl: './bot-board.component.html',
  styleUrls: ['./bot-board.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    OfflineMovesComponent
  ]
})
export class BotBoardComponent extends OfflineBoardComponent implements OnInit, OnDestroy {
  botColor: 'black' | 'white' = 'black';
  playerColor: 'black' | 'white' = 'white';
  difficulty: number = 2; // Default: media difficoltà
  isThinking: boolean = false;

  // Proprietà per l'animazione della cattura
  isAnimatingCapture: boolean = false;
  captureAnimationPath: { row: number, col: number }[] = [];
  captureAnimationStep: number = 0;
  captureAnimationInterval: any = null;

  // Proprietà per il drag and drop
  override draggedPiece: { row: number, col: number } | null = null;
  override dragOverCell: { row: number, col: number } | null = null;

  constructor(
    private botService: BotService,
    audioService: AudioService,
    translate: TranslateService
  ) {
    super(audioService, translate);
  }

  override ngOnInit() {
    super.ngOnInit();

    // Se il bot inizia, fagli fare la prima mossa
    if (this.currentPlayer === this.botColor) {
      this.getBotMove();
    }
  }

  override ngOnDestroy() {
    // Pulisci eventuali interval quando il componente viene distrutto
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }
    
    // Chiama il metodo della classe base
    super.ngOnDestroy();
  }

  /**
   * Override del metodo makeMove per aggiungere la logica del bot
   */
  override makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number): void {

    // Poi esegui la mossa normalmente
    super.makeMove(fromRow, fromCol, toRow, toCol);

    // Se dopo la mossa del giocatore è il turno del bot e la partita non è finita
    if (!this.gameOver && this.currentPlayer === this.botColor) {
      // Aggiungi un piccolo ritardo per dare l'illusione che il bot stia "pensando"
      setTimeout(() => {
        this.getBotMove();
      }, 500);
    }
  }

  // Metodo per ottenere la mossa del bot dall'API
  getBotMove() {
    this.isThinking = true;

    // Prepara la richiesta per l'API
    const request = {
      board: this.board.map(row => row.map(cell => {
        if (!cell.hasPiece) return '';
        return cell.isKing
          ? (cell.pieceColor === 'white' ? 'W' : 'B')
          : (cell.pieceColor === 'white' ? 'w' : 'b');
      })),
      playerColor: this.botColor,
      difficulty: this.difficulty
    };

    this.botService.calculateMove(request).subscribe({
      next: (response) => {
        // Nascondi l'indicatore di "pensiero" del bot
        this.isThinking = false;

        // Converti le coordinate dalla notazione dell'API
        const fromRow = parseInt(response.from.charAt(0));
        const fromCol = parseInt(response.from.charAt(1));
        const toRow = parseInt(response.to.charAt(0));
        const toCol = parseInt(response.to.charAt(1));

        // Esegui la mossa del bot
        if (response.path && response.path.length > 0) {
          // Gestisci cattura multipla con animazione
          this.moves = [...this.moves, {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: [{ row: fromRow + (toRow - fromRow) / 2, col: fromCol + (toCol - fromCol) / 2 }]
          }];
          this.animateBotCapturePath(fromRow, fromCol, response.path);
        } else {
          // Mossa semplice
          super.makeMove(fromRow, fromCol, toRow, toCol);
        }
      },
      error: (err) => {
        console.error('Errore durante il calcolo della mossa del bot:', err);
        this.isThinking = false;
      }
    });
  }

  // Metodo per animare un percorso di cattura multipla
  animateBotCapturePath(startRow: number, startCol: number, path: string[]) {
    // Interrompi eventuali animazioni in corso
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }

    this.isAnimatingCapture = true;

    // Costruisci il percorso completo includendo la posizione iniziale
    this.captureAnimationPath = [{ row: startRow, col: startCol }];

    // Aggiungi ogni posizione nel percorso
    for (const pos of path) {
      const row = parseInt(pos.charAt(0));
      const col = parseInt(pos.charAt(1));
      this.captureAnimationPath.push({ row, col });
    }

    this.captureAnimationStep = 0;

    // Salva il colore e lo stato della dama della pedina
    const movingPiece = { ...this.board[startRow][startCol] };

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

        // Applica l'animazione di movimento al pezzo corrente
        const currentPieceElement = this.getPieceElement(current.row, current.col);
        if (currentPieceElement) {
          currentPieceElement.classList.add('moving');
        }

        // Applica l'animazione di cattura al pezzo catturato
        const capturedPieceElement = this.getPieceElement(capturedRow, capturedCol);
        if (capturedPieceElement) {
          capturedPieceElement.classList.add('captured');
        }

        // Attendi che l'animazione finisca prima di aggiornare lo stato
        setTimeout(() => {
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
        }, 300); // Attendi 300ms per l'animazione

        // Verifica se la pedina diventa dama
        if (!movingPiece.isKing) {
          if ((movingPiece.pieceColor === 'white' && next.row === 0) ||
            (movingPiece.pieceColor === 'black' && next.row === 7)) {
            // La pedina diventa dama
            movingPiece.isKing = true;

            // Riproduci suono promozione a dama
            this.audioService.playKingSound();
          }
        }

        // Sposta il pezzo nella nuova posizione
        this.board[next.row][next.col] = {
          hasPiece: true,
          pieceColor: movingPiece.pieceColor,
          isKing: movingPiece.isKing
        };

        // Applica l'animazione di movimento al pezzo nella nuova posizione
        setTimeout(() => {
          const newPieceElement = this.getPieceElement(next.row, next.col);
          if (newPieceElement) {
            newPieceElement.classList.add('moving');
          }
        }, 10); // Piccolo ritardo per assicurarsi che il DOM sia aggiornato

        // Riproduci il suono di cattura
        this.audioService.playCaptureSound();

        // Avanza all'animazione successiva
        this.captureAnimationStep++;

        // Forza l'aggiornamento dell'interfaccia
        this.board = [...this.board];
      } else {
        // Fine dell'animazione
        clearInterval(this.captureAnimationInterval);
        this.captureAnimationInterval = null;
        this.isAnimatingCapture = false;

        // Cambia il turno
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Aggiorna il conteggio delle pedine
        this.updatePieceCount();

        // Controlla se la partita è finita
        this.checkGameOver();
      }
    }, 500); // Ritardo di 500ms tra ogni passo dell'animazione
  }

  // Metodo per aggiornare il conteggio delle pedine
  updatePieceCount() {
    this.whiteCount = 0;
    this.blackCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (cell.hasPiece) {
          if (cell.pieceColor === 'white') this.whiteCount++;
          else this.blackCount++;
        }
      }
    }
  }

  // Override per gestire i click durante l'animazione
  override onCellClick(row: number, col: number): void {
    // Se c'è un'animazione in corso o non è il turno del giocatore, ignora i click
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor) {
      return;
    }

    // Altrimenti procedi normalmente
    super.onCellClick(row, col);
  }

  // Metodo per cambiare la difficoltà
  setDifficulty(level: number) {
    this.difficulty = level;
  }

  // Metodo per cambiare il colore del bot
  setColors(botColor: 'black' | 'white') {
    this.botColor = botColor;
    this.playerColor = botColor === 'black' ? 'white' : 'black';

    // Resetta il gioco
    this.resetGame();

    // Se il bot inizia, fagli fare la prima mossa
    if (this.currentPlayer === this.botColor) {
      this.getBotMove();
    }
  }

  override resetGame(): void {
    super.resetGame();

    // Interrompi eventuali animazioni in corso
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }

    this.isAnimatingCapture = false;
    this.isThinking = false;

    // Se il bot inizia, fagli fare la prima mossa
    if (this.currentPlayer === this.botColor) {
      setTimeout(() => {
        this.getBotMove();
      }, 500);
    }
  }

  // Override dei metodi di drag and drop
  override onDragStart(event: DragEvent, row: number, col: number): void {
    // Se c'è un'animazione in corso, il bot sta pensando, o non è il turno del giocatore, ignora il drag
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      event.preventDefault();
      return;
    }

    // Altrimenti procedi normalmente
    super.onDragStart(event, row, col);
  }

  override onDragOver(event: DragEvent, row: number, col: number): void {
    // Se c'è un'animazione in corso, il bot sta pensando, o non è il turno del giocatore, ignora il drag over
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      return;
    }

    // Altrimenti procedi normalmente
    super.onDragOver(event, row, col);
  }

  override onDrop(event: DragEvent, row: number, col: number): void {
    // Se c'è un'animazione in corso, il bot sta pensando, o non è il turno del giocatore, ignora il drop
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      return;
    }

    // Altrimenti procedi normalmente
    super.onDrop(event, row, col);
  }

  override onDragEnd(event: DragEvent): void {
    // Se c'è un'animazione in corso, il bot sta pensando, o non è il turno del giocatore, ignora il drag end
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      return;
    }

    // Altrimenti procedi normalmente
    super.onDragEnd(event);
  }

  /**
   * Sovrascrivi il metodo per mostrare un messaggio di errore personalizzato
   * per la modalità di gioco contro il bot
   */
  override showTurnErrorMessage(): void {
    // Cancella il timer precedente se esiste
    if (this.errorMessageTimeout) {
      clearTimeout(this.errorMessageTimeout);
    }
    
    // Usa chiavi di traduzione specifiche per il bot
    const key = this.currentPlayer === this.playerColor ? 
      'BOT.YOUR_TURN_ERROR' : 
      'BOT.BOT_TURN_ERROR';
      
    this.translate.get(key).subscribe((message: string) => {
      this.errorMessage = message;
      this.showErrorMessage = true;
    });
    
    this.errorMessageTimeout = setTimeout(() => {
      this.showErrorMessage = false;
      this.errorMessage = null;
    }, 3000);
  }
}