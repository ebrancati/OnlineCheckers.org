import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface Move {
  from: { row: number, col: number };
  to: { row: number, col: number };
  captured?: { row: number, col: number }[];
}

interface FormattedMove {
  notation: string;
  isCaptureContinuation: boolean;
}

interface TurnMoves {
  number: number;
  white: FormattedMove[];
  black: FormattedMove[];
}

@Component({
  selector: 'app-online-moves',
  standalone: true,
  imports: [
    CommonModule, TranslateModule
  ],
  templateUrl: './online-moves.component.html',
  styleUrl: './online-moves.component.css',
})
export class OnlineMovesComponent implements OnChanges {
  @Input() moves: Move[] = [];
  displayMoves: TurnMoves[] = [];

  ngOnChanges(): void {
    // Reset display moves
    this.displayMoves = [];

    if (this.moves.length === 0) return;

    let currentTurn = 1;
    let currentMove = 0;
    let isWhiteTurn = true; // Bianco inizia sempre

    // Inizializza primo turno
    this.displayMoves.push({
      number: currentTurn,
      white: [],
      black: []
    });

    // Analizziamo le mosse per organizzarle in turni bianco/nero
    while (currentMove < this.moves.length) {
      const currentTurnData = this.displayMoves[this.displayMoves.length - 1];

      // Gestione mossa bianca
      if (isWhiteTurn) {
        // Prima mossa bianca in questo turno
        const move = this.moves[currentMove];
        const formattedMove = {
          notation: this.formatMove(move),
          isCaptureContinuation: false
        };

        currentTurnData.white.push(formattedMove);
        currentMove++;

        // Controlliamo se ci sono catture multiple da parte del bianco
        while (currentMove < this.moves.length &&
               this.isFollowUpCapture(this.moves[currentMove-1], this.moves[currentMove])) {
          const captureMove = this.moves[currentMove];
          const formattedCapture = {
            notation: this.formatCaptureChain(captureMove),
            isCaptureContinuation: true
          };

          currentTurnData.white.push(formattedCapture);
          currentMove++;
        }

        isWhiteTurn = false;
      }
      // Gestione mossa nera
      else {
        if (currentMove < this.moves.length) {
          // Mossa nera
          const move = this.moves[currentMove];
          const formattedMove = {
            notation: this.formatMove(move),
            isCaptureContinuation: false
          };

          currentTurnData.black.push(formattedMove);
          currentMove++;

          // Controlliamo se ci sono catture multiple da parte del nero
          while (currentMove < this.moves.length &&
                 this.isFollowUpCapture(this.moves[currentMove-1], this.moves[currentMove])) {
            const captureMove = this.moves[currentMove];
            const formattedCapture = {
              notation: this.formatCaptureChain(captureMove),
              isCaptureContinuation: true
            };

            currentTurnData.black.push(formattedCapture);
            currentMove++;
          }
        }

        isWhiteTurn = true;
        currentTurn++;

        // Prepara il prossimo turno se ci sono altre mosse
        if (currentMove < this.moves.length) {
          this.displayMoves.push({
            number: currentTurn,
            white: [],
            black: []
          });
        }
      }
    }
  }

  /**
   * Calcola quante righe deve occupare il numero del turno
   */
  getRowSpan(turn: TurnMoves): number {
    // Calcola il numero massimo di mosse tra bianco e nero
    return Math.max(turn.white.length, turn.black.length);
  }

  /**
   * Controlla se una mossa è la continuazione di una cattura multipla
   */
  private isFollowUpCapture(prevMove: Move, currentMove: Move): boolean {
    return prevMove.to.row === currentMove.from.row &&
           prevMove.to.col === currentMove.from.col &&
           !!currentMove.captured;
  }

  /**
   * Formatta una parte di cattura multipla
   */
  private formatCaptureChain(move: Move): string {
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return `x${to}`;
  }

  /**
   * Converte le coordinate della scacchiera in notazione algebrica
   */
  protected toAlgebraic(row: number, col: number): string {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return columns[col] + rows[row];
  }

  /**
   * Formatta una singola mossa in notazione algebrica
   */
  private formatMove(move: Move): string {
    const from = this.toAlgebraic(move.from.row, move.from.col);
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return move.captured ? `${from}x${to}` : `${from}-${to}`;
  }
}