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
  selector: 'app-offline-moves',
  standalone: true,
  imports: [
    CommonModule, TranslateModule
  ],
  templateUrl: './offline-moves.component.html',
  styleUrl: './offline-moves.component.css',
})
export class OfflineMovesComponent implements OnChanges {
  @Input() moves: Move[] = [];
  displayMoves: TurnMoves[] = [];

  ngOnChanges(): void {
    // Reset display moves
    this.displayMoves = [];

    if (this.moves.length === 0) return;

    // Struttura delle mosse organizate per turno
    const organizedMoves: TurnMoves[] = [];
    let currentTurn: TurnMoves = { number: 1, white: [], black: [] };
    let isWhiteTurn = true;
    let lastPosition: { row: number, col: number } | null = null;

    // Processa tutte le mosse
    for (let i = 0; i < this.moves.length; i++) {
      const move = this.moves[i];
      
      // Verifica se è una cattura multipla
      const isMultiCapture = lastPosition !== null && 
                            move.from.row === lastPosition.row && 
                            move.from.col === lastPosition.col;
      
      // Formatta la mossa
      const formattedMove: FormattedMove = {
        notation: isMultiCapture ? 
                  this.formatCaptureChain(move) : 
                  this.formatMove(move),
        isCaptureContinuation: isMultiCapture
      };
      
      // Aggiungi la mossa al turno corrente
      if (isWhiteTurn) {
        currentTurn.white.push(formattedMove);
        
        // Se non è una cattura multipla o è l'ultima mossa, passa al nero
        if (!move.captured || 
            i === this.moves.length - 1 || 
            this.moves[i+1].from.row !== move.to.row || 
            this.moves[i+1].from.col !== move.to.col) {
          isWhiteTurn = false;
        }
      } else {
        currentTurn.black.push(formattedMove);
        
        // Se non è una cattura multipla o è l'ultima mossa, passa al bianco e inizia un nuovo turno
        if (!move.captured || 
            i === this.moves.length - 1 || 
            this.moves[i+1].from.row !== move.to.row || 
            this.moves[i+1].from.col !== move.to.col) {
          isWhiteTurn = true;
          organizedMoves.push(currentTurn);
          currentTurn = { number: currentTurn.number + 1, white: [], black: [] };
        }
      }
      
      // Aggiorna l'ultima posizione per rilevare catture multiple
      lastPosition = move.to;
    }
    
    // Aggiungi l'ultimo turno se non è vuoto
    if (currentTurn.white.length > 0 || currentTurn.black.length > 0) {
      organizedMoves.push(currentTurn);
    }
    
    this.displayMoves = organizedMoves;
  }

  /**
   * Calcola quante righe deve occupare il numero del turno
   */
  getRowSpan(turn: TurnMoves): number {
    // Calcola il numero massimo di mosse tra bianco e nero
    return Math.max(turn.white.length, turn.black.length);
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
  private toAlgebraic(row: number, col: number): string {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
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