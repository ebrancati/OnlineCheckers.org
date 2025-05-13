package org.checkersonline.backend.model.dtos.services;

import org.checkersonline.backend.model.dtos.BotMoveRequestDto;
import org.checkersonline.backend.model.dtos.BotMoveResponseDto;
import org.checkersonline.backend.model.entities.enums.Team;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class BotService {

    public BotMoveResponseDto calculateBotMove(BotMoveRequestDto request) {
        // Converti il playerColor in Team
        Team botTeam = request.getPlayerColor().equalsIgnoreCase("white") ? Team.WHITE : Team.BLACK;

        // Imposta la profondità in base alla difficoltà
        int depth;
        switch (request.getDifficulty()) {
            case 1: depth = 1; break;
            case 2: depth = 3; break;
            case 3: depth = 5; break;
            default: depth = 4; // Default a medio
        }

        // Esegui MinMax con alpha-beta pruning
        MoveEvaluation bestMove = minimax(request.getBoard(), depth, Integer.MIN_VALUE, Integer.MAX_VALUE, true, botTeam);

        // Se non abbiamo trovato mosse, restituisci null o una risposta appropriata
        if (bestMove.getFromPosition() == null || bestMove.getToPosition() == null) {
            return new BotMoveResponseDto("00", "00", null); // O gestisci diversamente
        }

        // Converti il risultato nel formato della risposta
        return new BotMoveResponseDto(
                bestMove.getFromPosition(),
                bestMove.getToPosition(),
                bestMove.getCapturePath()
        );
    }

    private MoveEvaluation minimax(String[][] board, int depth, int alpha, int beta, boolean isMaximizing, Team team) {
        // Controlla fine gioco o profondità massima
        if (depth == 0 || isGameOver(board)) {
            return new MoveEvaluation(evaluateBoard(board, team), null, null, null);
        }

        // Opponent team
        Team opponentTeam = (team == Team.WHITE) ? Team.BLACK : Team.WHITE;
        Team currentTeam = isMaximizing ? team : opponentTeam;

        // Implementazione dell'algoritmo MinMax con alpha-beta pruning
        if (isMaximizing) {
            MoveEvaluation bestEval = new MoveEvaluation(Integer.MIN_VALUE, null, null, null);
            List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

            if (possibleMoves.isEmpty()) {
                // Se non ci sono mosse, l'altro giocatore vince
                return new MoveEvaluation(Integer.MIN_VALUE, null, null, null);
            }

            for (Move move : possibleMoves) {
                // Applica la mossa su una copia della board
                String[][] boardCopy = copyBoard(board);
                applyMove(boardCopy, move);

                // Valuta la mossa ricorsivamente
                MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, false, team);

                // Calcola il numero di catture in questa mossa
                int captureCount = 0;
                if (move.getCapturePath() != null) {
                    captureCount = move.getCapturePath().size();
                }

                // Aggiunge un bonus al punteggio proporzionale al numero di catture
                int adjustedScore = eval.getScore() + (captureCount * 5); // Bonus per cattura

                // Aggiorna la valutazione migliore
                if (adjustedScore > bestEval.getScore() ||
                        (adjustedScore == bestEval.getScore() && captureCount > bestEval.getCaptureCount())) {
                    bestEval = new MoveEvaluation(
                            adjustedScore,
                            move.getFromPosition(),
                            move.getToPosition(),
                            move.getCapturePath(),
                            captureCount
                    );
                }

                // Alpha-beta pruning
                alpha = Math.max(alpha, adjustedScore);
                if (beta <= alpha) {
                    break;
                }
            }

            return bestEval;
        } else {
            MoveEvaluation bestEval = new MoveEvaluation(Integer.MAX_VALUE, null, null, null);
            List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

            if (possibleMoves.isEmpty()) {
                // Se non ci sono mosse, l'altro giocatore vince
                return new MoveEvaluation(Integer.MAX_VALUE, null, null, null);
            }

            for (Move move : possibleMoves) {
                // Applica la mossa su una copia della board
                String[][] boardCopy = copyBoard(board);
                applyMove(boardCopy, move);

                // Valuta la mossa ricorsivamente
                MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, true, team);

                // Calcola il numero di catture in questa mossa
                int captureCount = 0;
                if (move.getCapturePath() != null) {
                    captureCount = move.getCapturePath().size();
                }

                // Sottrae un bonus al punteggio proporzionale al numero di catture
                int adjustedScore = eval.getScore() - (captureCount * 5); // Penalità per cattura avversaria

                // Aggiorna la valutazione migliore (la mossa peggiore per il bot)
                if (adjustedScore < bestEval.getScore() ||
                        (adjustedScore == bestEval.getScore() && captureCount > bestEval.getCaptureCount())) {
                    bestEval = new MoveEvaluation(
                            adjustedScore,
                            move.getFromPosition(),
                            move.getToPosition(),
                            move.getCapturePath(),
                            captureCount
                    );
                }

                // Alpha-beta pruning
                beta = Math.min(beta, adjustedScore);
                if (beta <= alpha) {
                    break;
                }
            }

            return bestEval;
        }
    }

    // Classe per rappresentare una possibile mossa
    private static class Move {
        private String fromPosition;
        private String toPosition;
        private List<String> capturePath;

        public Move(String fromPosition, String toPosition, List<String> capturePath) {
            this.fromPosition = fromPosition;
            this.toPosition = toPosition;
            this.capturePath = capturePath;
        }

        public String getFromPosition() {
            return fromPosition;
        }

        public String getToPosition() {
            return toPosition;
        }

        public List<String> getCapturePath() {
            return capturePath;
        }
    }

    // Classe per gestire il risultato della valutazione di una mossa
    private static class MoveEvaluation {
        private int score;
        private String fromPosition;
        private String toPosition;
        private List<String> capturePath;
        private int captureCount;

        public MoveEvaluation(int score, String fromPosition, String toPosition, List<String> capturePath) {
            this(score, fromPosition, toPosition, capturePath, 0);
        }

        public MoveEvaluation(int score, String fromPosition, String toPosition, List<String> capturePath, int captureCount) {
            this.score = score;
            this.fromPosition = fromPosition;
            this.toPosition = toPosition;
            this.capturePath = capturePath;
            this.captureCount = captureCount;
        }

        public int getScore() {
            return score;
        }

        public String getFromPosition() {
            return fromPosition;
        }

        public String getToPosition() {
            return toPosition;
        }

        public List<String> getCapturePath() {
            return capturePath;
        }

        public int getCaptureCount() {
            return captureCount;
        }
    }

    // Verifica se il gioco è finito
    private boolean isGameOver(String[][] board) {
        boolean whiteExists = false;
        boolean blackExists = false;

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                if (piece.equalsIgnoreCase("w")) {
                    whiteExists = true;
                } else if (piece.equalsIgnoreCase("b")) {
                    blackExists = true;
                }

                if (whiteExists && blackExists) return false; // Entrambi i giocatori hanno pezzi
            }
        }

        return true; // Game over se uno dei due giocatori non ha pezzi
    }

    // Valuta la posizione sulla scacchiera
    private int evaluateBoard(String[][] board, Team team) {
        int whiteScore = 0;
        int blackScore = 0;

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Pedine: 10 punti, Dame: 20 punti
                int value = Character.isUpperCase(piece.charAt(0)) ? 20 : 10;

                // Bonus posizionale (es: pedine più avanzate o vicine a diventare dame)
                int positionalBonus = 0;
                if (piece.toLowerCase().equals("w")) {
                    // Bianco vuole andare verso l'alto (riga 0)
                    positionalBonus = (7 - i) * 2;

                    // Bonus aggiuntivo per pedine vicine al bordo (più difficili da catturare)
                    if (j == 0 || j == 7) positionalBonus += 2;

                    whiteScore += value + positionalBonus;
                } else {
                    // Nero vuole andare verso il basso (riga 7)
                    positionalBonus = i * 2;

                    // Bonus aggiuntivo per pedine vicine al bordo
                    if (j == 0 || j == 7) positionalBonus += 2;

                    blackScore += value + positionalBonus;
                }
            }
        }

        // Ritorna il punteggio in base al team del bot
        return (team == Team.WHITE) ? (whiteScore - blackScore) : (blackScore - whiteScore);
    }

    // Ottieni tutte le mosse possibili per un giocatore
    private List<Move> getAllPossibleMoves(String[][] board, Team team) {
        List<Move> moves = new ArrayList<>();

        // Priorità alle catture forzate
        List<Move> captures = getAllCaptures(board, team);
        if (!captures.isEmpty()) {
            return captures;
        }

        // Pedina bianca o nera?
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';

        // Se non ci sono catture, aggiungi le mosse normali
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Verifica se è una pedina del team corretto
                if (piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Direzioni di movimento
                int[][] directions;
                if (isKing) {
                    // Re: tutte le direzioni diagonali
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    // Pedina: solo avanti
                    if (team == Team.WHITE) {
                        directions = new int[][]{{-1, 1}, {-1, -1}}; // Bianco va verso l'alto
                    } else {
                        directions = new int[][]{{1, 1}, {1, -1}}; // Nero va verso il basso
                    }
                }

                // Controlla le mosse in ogni direzione
                for (int[] dir : directions) {
                    int newRow = i + dir[0];
                    int newCol = j + dir[1];

                    // Verifica che la posizione sia valida
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        // Verifica che la cella sia vuota
                        if (board[newRow][newCol] == null || board[newRow][newCol].isEmpty()) {
                            String toPos = newRow + "" + newCol;
                            moves.add(new Move(fromPos, toPos, null));
                        }
                    }
                }
            }
        }

        return moves;
    }

    // Ottieni tutte le catture possibili, scegliendo quelle che massimizzano le pedine catturate
    private List<Move> getAllCaptures(String[][] board, Team team) {
        List<Move> allCaptures = new ArrayList<>();

        // Pedina bianca o nera?
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Verifica se è una pedina del team corretto
                if (piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Direzioni di cattura
                int[][] directions;
                if (isKing) {
                    // Dame: tutte le direzioni diagonali
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    // Pedine: solo avanti (a seconda del colore)
                    if (team == Team.WHITE) {
                        // Il bianco va verso l'alto (riga 0)
                        directions = new int[][]{{-1, 1}, {-1, -1}};
                    } else {
                        // Il nero va verso il basso (riga 7)
                        directions = new int[][]{{1, 1}, {1, -1}};
                    }
                }

                // Cerca catture in ogni direzione
                for (int[] dir : directions) {
                    int captureRow = i + dir[0];
                    int captureCol = j + dir[1];
                    int landRow = i + 2 * dir[0];
                    int landCol = j + 2 * dir[1];

                    // Verifica che le posizioni siano valide
                    if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                            landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                        continue;
                    }

                    // Verifica che ci sia un pezzo avversario da catturare
                    String capturePiece = board[captureRow][captureCol];
                    if (capturePiece == null || capturePiece.isEmpty()) continue;
                    if (capturePiece.toLowerCase().charAt(0) != opponentChar) continue;

                    // Verifica che la cella di atterraggio sia vuota
                    if (board[landRow][landCol] != null && !board[landRow][landCol].isEmpty()) continue;

                    // Aggiungi questa cattura
                    String toPos = landRow + "" + landCol;
                    List<String> path = new ArrayList<>();
                    path.add(toPos);

                    // Simula la cattura per cercare catture successive
                    String[][] boardCopy = copyBoard(board);
                    boardCopy[landRow][landCol] = boardCopy[i][j]; // Sposta il pezzo
                    boardCopy[i][j] = ""; // Rimuovi il pezzo dalla posizione originale
                    boardCopy[captureRow][captureCol] = ""; // Rimuovi il pezzo catturato

                    // Promozione a dama se necessario
                    if (!isKing) {
                        if ((team == Team.WHITE && landRow == 0) || (team == Team.BLACK && landRow == 7)) {
                            boardCopy[landRow][landCol] = boardCopy[landRow][landCol].toUpperCase();
                            isKing = true; // La pedina è stata promossa a dama
                        }
                    }

                    // Cerca ricorsivamente ulteriori catture
                    List<List<String>> subPaths = new ArrayList<>();
                    findMultipleCaptures(boardCopy, team, landRow, landCol, isKing, subPaths, new HashSet<>());

                    if (subPaths.isEmpty()) {
                        // Nessuna cattura successiva
                        allCaptures.add(new Move(fromPos, toPos, path));
                    } else {
                        // Ci sono catture successive, aggiungi ciascun percorso completo
                        for (List<String> subPath : subPaths) {
                            List<String> fullPath = new ArrayList<>(path);
                            fullPath.addAll(subPath);
                            allCaptures.add(new Move(fromPos, fullPath.get(fullPath.size() - 1), fullPath));
                        }
                    }
                }
            }
        }

        // Se non ci sono catture, restituisci una lista vuota
        if (allCaptures.isEmpty()) {
            return allCaptures;
        }

        // Determina il massimo numero di catture
        int maxCaptures = 0;
        for (Move move : allCaptures) {
            int captureCount = 0;
            if (move.getCapturePath() != null) {
                captureCount = move.getCapturePath().size();
            }
            maxCaptures = Math.max(maxCaptures, captureCount);
        }

        // Filtra solo le catture con il massimo numero
        List<Move> bestCaptures = new ArrayList<>();
        for (Move move : allCaptures) {
            int captureCount = 0;
            if (move.getCapturePath() != null) {
                captureCount = move.getCapturePath().size();
            }
            if (captureCount == maxCaptures) {
                bestCaptures.add(move);
            }
        }

        return bestCaptures;
    }

    // Trova le catture multiple a partire da una posizione
    private void findMultipleCaptures(String[][] board, Team team, int row, int col, boolean isKing,
                                      List<List<String>> allPaths, Set<String> capturedPositions) {

        // Pedina avversaria
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        // Direzioni di cattura
        int[][] directions;
        if (isKing) {
            // Dame: tutte le direzioni diagonali
            directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
        } else {
            // Pedine: solo avanti (a seconda del colore)
            if (team == Team.WHITE) {
                // Il bianco va verso l'alto (riga 0)
                directions = new int[][]{{-1, 1}, {-1, -1}};
            } else {
                // Il nero va verso il basso (riga 7)
                directions = new int[][]{{1, 1}, {1, -1}};
            }
        }

        boolean foundCapture = false;

        for (int[] dir : directions) {
            int captureRow = row + dir[0];
            int captureCol = col + dir[1];
            int landRow = row + 2 * dir[0];
            int landCol = col + 2 * dir[1];

            // Verifica che le posizioni siano valide
            if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                    landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                continue;
            }

            // Posizione della pedina da catturare
            String capturePos = captureRow + "" + captureCol;

            // Verifica che ci sia un pezzo avversario da catturare
            String capturePiece = board[captureRow][captureCol];
            if (capturePiece == null || capturePiece.isEmpty()) continue;
            if (capturePiece.toLowerCase().charAt(0) != opponentChar) continue;

            // Verifica che non abbiamo già catturato questa pedina in questo percorso
            if (capturedPositions.contains(capturePos)) continue;

            // Verifica che la cella di atterraggio sia vuota
            if (board[landRow][landCol] != null && !board[landRow][landCol].isEmpty()) continue;

            // Posizione di atterraggio
            String landPos = landRow + "" + landCol;

            // Crea una copia del set di pedine catturate e aggiungi questa
            Set<String> newCapturedPositions = new HashSet<>(capturedPositions);
            newCapturedPositions.add(capturePos);

            // Crea una copia della board per simulare la cattura
            String[][] boardCopy = copyBoard(board);
            boardCopy[landRow][landCol] = boardCopy[row][col]; // Sposta il pezzo
            boardCopy[row][col] = ""; // Rimuovi il pezzo dalla posizione originale
            boardCopy[captureRow][captureCol] = ""; // Rimuovi il pezzo catturato

            // Verifica promozione a dama
            boolean becameKing = false;
            if (!isKing) {
                if ((team == Team.WHITE && landRow == 0) || (team == Team.BLACK && landRow == 7)) {
                    boardCopy[landRow][landCol] = boardCopy[landRow][landCol].toUpperCase();
                    becameKing = true;
                }
            }

            // Trova ulteriori catture
            List<List<String>> subPaths = new ArrayList<>();
            findMultipleCaptures(boardCopy, team, landRow, landCol, isKing || becameKing, subPaths, newCapturedPositions);

            if (subPaths.isEmpty()) {
                // Nessuna cattura successiva, aggiungi questa singola posizione
                List<String> path = new ArrayList<>();
                path.add(landPos);
                allPaths.add(path);
            } else {
                // Aggiungi questa posizione a ciascun percorso successivo
                for (List<String> subPath : subPaths) {
                    List<String> fullPath = new ArrayList<>();
                    fullPath.add(landPos);
                    fullPath.addAll(subPath);
                    allPaths.add(fullPath);
                }
            }

            foundCapture = true;
        }

        // Se non abbiamo trovato ulteriori catture, restituisci una lista vuota
        if (!foundCapture) {
            allPaths.add(new ArrayList<>());
        }
    }

    // Copia la board per evitare modifiche alla board originale
    private String[][] copyBoard(String[][] board) {
        String[][] copy = new String[8][8];
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                copy[i][j] = board[i][j];
            }
        }
        return copy;
    }

    // Applica una mossa alla board
    private void applyMove(String[][] board, Move move) {
        int fromRow = Character.getNumericValue(move.getFromPosition().charAt(0));
        int fromCol = Character.getNumericValue(move.getFromPosition().charAt(1));
        int toRow = Character.getNumericValue(move.getToPosition().charAt(0));
        int toCol = Character.getNumericValue(move.getToPosition().charAt(1));

        // Verifica se è una cattura
        boolean isCapture = Math.abs(fromRow - toRow) == 2 && Math.abs(fromCol - toCol) == 2;

        // Ottieni il pezzo che si muove
        String piece = board[fromRow][fromCol];

        // Sposta il pezzo
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = "";

        // Se è una cattura, rimuovi il pezzo catturato
        if (isCapture) {
            int capturedRow = (fromRow + toRow) / 2;
            int capturedCol = (fromCol + toCol) / 2;
            board[capturedRow][capturedCol] = "";
        }

        // Se ci sono più catture, applica tutto il percorso
        if (move.getCapturePath() != null && move.getCapturePath().size() > 1) {
            String currentPos = move.getFromPosition();
            for (String nextPos : move.getCapturePath()) {
                int curRow = Character.getNumericValue(currentPos.charAt(0));
                int curCol = Character.getNumericValue(currentPos.charAt(1));
                int nextRow = Character.getNumericValue(nextPos.charAt(0));
                int nextCol = Character.getNumericValue(nextPos.charAt(1));

                // Rimuovi la pedina catturata
                int capturedRow = (curRow + nextRow) / 2;
                int capturedCol = (curCol + nextCol) / 2;
                board[capturedRow][capturedCol] = "";

                // Sposta la pedina
                board[nextRow][nextCol] = board[curRow][curCol];
                board[curRow][curCol] = "";

                currentPos = nextPos;
            }
        }

        // Verifica promozione a dama
        if (piece.equals("w") && toRow == 0) {
            board[toRow][toCol] = "W"; // Promuovi a dama bianca
        } else if (piece.equals("b") && toRow == 7) {
            board[toRow][toCol] = "B"; // Promuovi a dama nera
        }
    }
}