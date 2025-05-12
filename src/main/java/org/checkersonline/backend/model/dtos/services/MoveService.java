package org.checkersonline.backend.model.dtos.services;

import org.checkersonline.backend.exceptions.InvalidMoveException;
import org.checkersonline.backend.exceptions.SessionGameNotFoundException;
import org.checkersonline.backend.model.daos.GameDao;
import org.checkersonline.backend.model.dtos.MoveDto;
import org.checkersonline.backend.model.entities.Game;
import org.checkersonline.backend.model.entities.enums.Team;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class MoveService {
    @Autowired
    private GameDao gameDao;

    public Game makeMove(String gameId, MoveDto dto) {

        System.out.println("===== RICHIESTA MOSSA =====");
        System.out.println("Game ID: " + gameId);
        System.out.println("From: " + dto.getFrom());
        System.out.println("To: " + dto.getTo());
        System.out.println("Player: " + dto.getPlayer());
        System.out.println("Path: " + dto.getPath());

        // Carica partita
        Game game = gameDao.findById(gameId)
                .orElseThrow(() -> new SessionGameNotFoundException(gameId));

        // Validazione player
        if (dto.getPlayer() == null) {
            throw new InvalidMoveException("Player field is required");
        }

        Team player;
        try {
            player = Team.valueOf(dto.getPlayer().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidMoveException("Invalid player: " + dto.getPlayer());
        }

        if (!player.equals(game.getTurno())) {
            throw new InvalidMoveException("Not " + player + "'s turn.");
        }

        String[][] board = game.getBoard();
        System.out.println("Stato scacchiera:");
        for (String[] row : board) {
            System.out.println(Arrays.toString(row));
        }

        // Estrai coordinate
        int fromR = Character.getNumericValue(dto.getFrom().charAt(0));
        int fromC = Character.getNumericValue(dto.getFrom().charAt(1));
        int toR   = Character.getNumericValue(dto.getTo().charAt(0));
        int toC   = Character.getNumericValue(dto.getTo().charAt(1));

        System.out.println("Coordinate: from[" + fromR + "," + fromC + "] to[" + toR + "," + toC + "]");

        try {
            validateCoordinates(fromR, fromC);
            validateCoordinates(toR, toC);
        } catch (InvalidMoveException e) {
            System.out.println("Errore validazione coordinate: " + e.getMessage());
            throw e;
        }

        String piece = board[fromR][fromC];
        if (piece.isEmpty()) {
            System.out.println("Errore: nessun pezzo in posizione " + dto.getFrom());
            throw new InvalidMoveException("No piece at position " + dto.getFrom());
        }

        boolean isWhitePiece = piece.equalsIgnoreCase("w");
        if ((player == Team.WHITE) != isWhitePiece) {
            System.out.println("Errore: il pezzo non appartiene al giocatore");
            throw new InvalidMoveException("Piece does not belong to player.");
        }

        if (!board[toR][toC].isEmpty()) {
            System.out.println("Errore: la destinazione non è vuota");
            throw new InvalidMoveException("Destination " + dto.getTo() + " is not empty.");
        }

        int dr = toR - fromR;
        int dc = toC - fromC;

        // Rileva automaticamente le catture
        boolean isPotentialCapture = Math.abs(dr) == 2 && Math.abs(dc) == 2;
        boolean isExplicitCapture = dto.getPath() != null && !dto.getPath().isEmpty();
        boolean isCapture = isExplicitCapture;

        // Se sembra una cattura, verifica se c'è un pezzo avversario nel mezzo
        if (isPotentialCapture && !isCapture) {
            int midR = (fromR + toR) / 2;
            int midC = (fromC + toC) / 2;

            String midPiece = board[midR][midC];
            boolean isOpponentPiece = !midPiece.isEmpty() && (midPiece.equalsIgnoreCase("w") != isWhitePiece);

            if (isOpponentPiece) {
                System.out.println("Rilevata cattura automatica: pezzo avversario in [" + midR + "," + midC + "]");

                // Crea un percorso
                if (dto.getPath() == null) {
                    dto.setPath(new ArrayList<>());
                }
                dto.getPath().add(dto.getTo());
                isCapture = true;

                System.out.println("Creato percorso per cattura: " + dto.getPath());
            }
        }

        System.out.println("È una mossa di cattura? " + isCapture);

        if (isCapture) {
            System.out.println("Elaborazione cattura con percorso: " + dto.getPath());

            // Eseguiamo le catture seguendo il percorso
            int currentR = fromR;
            int currentC = fromC;

            for (String position : dto.getPath()) {
                System.out.println("Elaborazione posizione nel percorso: " + position);

                int pathR = Character.getNumericValue(position.charAt(0));
                int pathC = Character.getNumericValue(position.charAt(1));

                System.out.println("Coordinate posizione: [" + pathR + "," + pathC + "]");

                try {
                    validateCoordinates(pathR, pathC);
                } catch (InvalidMoveException e) {
                    System.out.println("Errore validazione coordinate nel percorso: " + e.getMessage());
                    throw e;
                }

                // Verifica validità del salto
                int movedr = pathR - currentR;
                int movedc = pathC - currentC;
                System.out.println("Delta: dr=" + movedr + ", dc=" + movedc);

                if (Math.abs(movedr) != 2 || Math.abs(movedc) != 2) {
                    System.out.println("Errore: distanza di cattura non valida");
                    throw new InvalidMoveException("Invalid capture distance from " +
                            currentR + currentC + " to " + position +
                            ". Expected distance of 2, got dr=" + movedr + ", dc=" + movedc);
                }

                // Calcola la posizione della pedina catturata
                int capturedR = (currentR + pathR) / 2;
                int capturedC = (currentC + pathC) / 2;
                System.out.println("Pedina da catturare in: [" + capturedR + "," + capturedC + "]");

                String capturedPiece = board[capturedR][capturedC];
                System.out.println("Pedina da catturare: " + capturedPiece);

                if (capturedPiece.isEmpty()) {
                    System.out.println("Errore: nessun pezzo da catturare");
                    throw new InvalidMoveException("No piece to capture at " + capturedR + capturedC);
                }

                if (capturedPiece.equalsIgnoreCase(piece)) {
                    System.out.println("Errore: non puoi catturare i tuoi pezzi");
                    throw new InvalidMoveException("Cannot capture own piece at " + capturedR + capturedC);
                }

                // Verifica che la destinazione sia vuota
                if (!board[pathR][pathC].isEmpty()) {
                    System.out.println("Errore: la posizione di destinazione nel percorso non è vuota");
                    throw new InvalidMoveException("Destination in path is not empty: " + position);
                }

                // Rimuovi la pedina catturata
                board[capturedR][capturedC] = "";
                System.out.println("Pedina catturata rimossa");

                // Aggiorna conteggio pedine
                if (capturedPiece.equalsIgnoreCase("w")) {
                    if (capturedPiece.equals("w")) {
                        game.setPedineW(game.getPedineW() - 1);
                        System.out.println("Decrementate pedine bianche a " + game.getPedineW());
                    } else {
                        game.setDamaW(game.getDamaW() - 1);
                        System.out.println("Decrementate dame bianche a " + game.getDamaW());
                    }
                } else {
                    if (capturedPiece.equals("b")) {
                        game.setPedineB(game.getPedineB() - 1);
                        System.out.println("Decrementate pedine nere a " + game.getPedineB());
                    } else {
                        game.setDamaB(game.getDamaB() - 1);
                        System.out.println("Decrementate dame nere a " + game.getDamaB());
                    }
                }

                // Aggiungi alla cronologia mosse
                String moveRecord = currentR + "" + currentC + "-" +
                        pathR + "" + pathC + "-" +
                        dto.getPlayer();
                game.getCronologiaMosse().add(moveRecord);
                System.out.println("Aggiunta mossa alla cronologia: " + moveRecord);

                // Sposta temporaneamente il pezzo per la prossima cattura
                board[currentR][currentC] = "";

                // Verifica promozione a dama dopo ogni singolo passo
                if (piece.equals("w") && pathR == 0) {
                    // Promuovi a dama bianca
                    piece = "W";
                    game.setPedineW(game.getPedineW() - 1);
                    game.setDamaW(game.getDamaW() + 1);
                    System.out.println("Pedina bianca promossa a dama durante cattura multipla");
                }
                if (piece.equals("b") && pathR == 7) {
                    // Promuovi a dama nera
                    piece = "B";
                    game.setPedineB(game.getPedineB() - 1);
                    game.setDamaB(game.getDamaB() + 1);
                    System.out.println("Pedina nera promossa a dama durante cattura multipla");
                }

                // Posiziona il pezzo nella nuova posizione
                board[pathR][pathC] = piece;
                System.out.println("Pezzo spostato temporaneamente per prossima cattura");

                // Aggiorna la posizione corrente per la prossima cattura
                currentR = pathR;
                currentC = pathC;
            }

            System.out.println("Elaborazione percorso di cattura completata");
        } else {
            // Mossa semplice (senza cattura)
            System.out.println("Elaborazione mossa semplice");

            System.out.println("Delta: dr=" + dr + ", dc=" + dc);

            if (Character.isUpperCase(piece.charAt(0))) {
                // Dama: diagonale libera
                if (Math.abs(dr) != Math.abs(dc) || dr == 0) {
                    System.out.println("Errore: mossa diagonale non valida per dama");
                    throw new InvalidMoveException("Invalid simple move for king. Expected diagonal move, got dr=" + dr + ", dc=" + dc);
                }

                int stepR = dr / Math.abs(dr), stepC = dc / Math.abs(dc);
                for (int i = 1; i < Math.abs(dr); i++) {
                    int checkR = fromR + i*stepR;
                    int checkC = fromC + i*stepC;
                    System.out.println("Verificando cella [" + checkR + "," + checkC + "] lungo il percorso");

                    if (!board[checkR][checkC].isEmpty()) {
                        System.out.println("Errore: percorso bloccato per movimento dama");
                        throw new InvalidMoveException("Path is blocked for king move at [" + checkR + "," + checkC + "]");
                    }
                }
            } else {
                // Pedina: una sola diagonale avanti
                if (Math.abs(dr) != 1 || Math.abs(dc) != 1) {
                    System.out.println("Errore: mossa semplice non valida per pedina");
                    throw new InvalidMoveException("Invalid simple move for man. Expected dr,dc=±1, got dr=" + dr + ", dc=" + dc);
                }

                if (piece.equals("w") && dr != -1) {
                    System.out.println("Errore: le pedine bianche possono muoversi solo in avanti");
                    throw new InvalidMoveException("White man can only move forward. Got dr=" + dr);
                }

                if (piece.equals("b") && dr != 1) {
                    System.out.println("Errore: le pedine nere possono muoversi solo in avanti");
                    throw new InvalidMoveException("Black man can only move forward. Got dr=" + dr);
                }
            }

            // Aggiungi alla cronologia mosse
            String moveRecord = dto.getFrom() + "-" + dto.getTo() + "-" + dto.getPlayer();
            game.getCronologiaMosse().add(moveRecord);
            System.out.println("Aggiunta mossa alla cronologia: " + moveRecord);

            // Sposta la pedina per la mossa semplice
            board[fromR][fromC] = "";
            board[toR][toC] = piece;
            System.out.println("Pezzo spostato per mossa semplice");
        }

        // Controlla promozione a dama
        if (!isCapture) {
            if (piece.equals("w") && toR == 0) {
                board[toR][toC] = "W";  // Promuovi a dama bianca
                game.setPedineW(game.getPedineW() - 1);
                game.setDamaW(game.getDamaW() + 1);
                System.out.println("Pedina bianca promossa a dama");
            }
            if (piece.equals("b") && toR == 7) {
                board[toR][toC] = "B";  // Promuovi a dama nera
                game.setPedineB(game.getPedineB() - 1);
                game.setDamaB(game.getDamaB() + 1);
                System.out.println("Pedina nera promossa a dama");
            }
        } else {
            // Per catture multiple, controlla la promozione dopo l'ultima tappa
            String finalPiece = board[toR][toC];
            if (finalPiece.equals("w") && toR == 0) {
                board[toR][toC] = "W";  // Promuovi a dama bianca
                game.setPedineW(game.getPedineW() - 1);
                game.setDamaW(game.getDamaW() + 1);
                System.out.println("Pedina bianca promossa a dama dopo cattura");
            }
            if (finalPiece.equals("b") && toR == 7) {
                board[toR][toC] = "B";  // Promuovi a dama nera
                game.setPedineB(game.getPedineB() - 1);
                game.setDamaB(game.getDamaB() + 1);
                System.out.println("Pedina nera promossa a dama dopo cattura");
            }
        }

        // Cambio turno
        Team opponent = (player == Team.WHITE ? Team.BLACK : Team.WHITE);
        game.setTurno(opponent);
        System.out.println("Turno cambiato a " + opponent);

        // Controllo fine partita per mancanza pedine
        if (game.getPedineW() + game.getDamaW() == 0) {
            game.setPartitaTerminata(true);
            game.setVincitore(Team.BLACK);
            System.out.println("Partita terminata: vincitore NERO");
        }
        if (game.getPedineB() + game.getDamaB() == 0) {
            game.setPartitaTerminata(true);
            game.setVincitore(Team.WHITE);
            System.out.println("Partita terminata: vincitore BIANCO");
        }

        // Controllo se l'opponente ha mosse valide
        if (!game.isPartitaTerminata() && !hasAnyMoves(board, opponent)) {
            game.setPartitaTerminata(true);
            game.setVincitore(player);
            System.out.println("Partita terminata: " + opponent + " non ha mosse valide. Vincitore: " + player);
        }

        if (isCapture && dto.getPath() != null && dto.getPath().size() > 1) {
            // Salva il percorso di cattura multipla per mostrarlo all'avversario
            List<String> fullPath = new ArrayList<>();
            fullPath.add(dto.getFrom()); // Aggiungi la posizione iniziale
            fullPath.addAll(dto.getPath()); // Aggiungi tutte le posizioni intermedie
            game.setLastMultiCapturePath(fullPath);
            System.out.println("Salvato percorso completo di cattura multipla: " + fullPath);
        } else {
            // Pulisci il percorso per mosse normali o catture singole
            game.setLastMultiCapturePath(new ArrayList<>());
        }

        System.out.println("===== FINE ELABORAZIONE MOSSA =====");
        return gameDao.save(game);
    }

    // valida il percorso di cattura
    private void validateCapturePath(String[][] board, int startR, int startC, String piece, List<String> path) {
        if (path.isEmpty()) {
            throw new InvalidMoveException("Capture path is empty");
        }

        int currentR = startR;
        int currentC = startC;

        for (String position : path) {
            int pathR = Character.getNumericValue(position.charAt(0));
            int pathC = Character.getNumericValue(position.charAt(1));

            // Verifica validità della posizione
            validateCoordinates(pathR, pathC);

            // Verifica che la cella di destinazione sia vuota
            if (!board[pathR][pathC].isEmpty()) {
                throw new InvalidMoveException("Destination in path is not empty: " + position);
            }

            // Verifica che sia una mossa di cattura valida
            int dr = pathR - currentR;
            int dc = pathC - currentC;

            // Deve essere una mossa diagonale di 2 caselle (per cattura)
            if (Math.abs(dr) != 2 || Math.abs(dc) != 2) {
                throw new InvalidMoveException("Invalid capture distance in path: " + currentR + currentC + " to " + position);
            }

            // Verifica che ci sia una pedina avversaria da catturare
            int capturedR = (currentR + pathR) / 2;
            int capturedC = (currentC + pathC) / 2;
            String capturedPiece = board[capturedR][capturedC];

            if (capturedPiece.isEmpty()) {
                throw new InvalidMoveException("No piece to capture at " + capturedR + capturedC);
            }

            if (capturedPiece.equalsIgnoreCase(piece)) {
                throw new InvalidMoveException("Cannot capture own piece at " + capturedR + capturedC);
            }

            // Aggiorna la posizione corrente
            currentR = pathR;
            currentC = pathC;
        }
    }

    private void validateCoordinates(int r, int c) {
        if (r < 0 || r > 7 || c < 0 || c > 7) {
            throw new InvalidMoveException("Coordinates out of bounds: (" + r + "," + c + ")");
        }
    }

    private List<int[]> findCapturePath(String[][] board, int r, int c,
                                        int destR, int destC, String piece) {
        return dfs(board, r, c, destR, destC, piece, new HashSet<>());
    }

    private List<int[]> dfs(String[][] board, int r, int c,
                            int destR, int destC, String piece,
                            Set<String> used) {
        if (r == destR && c == destC) {
            return new ArrayList<>();
        }
        char pchar = piece.charAt(0);
        // Directions: four diagonals
        int[][] dirs = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

        for (int[] d : dirs) {
            int dr = d[0], dc = d[1];
            if (Character.isUpperCase(pchar)) {
                // King: can capture at any distance
                // scan for opponent piece along direction
                for (int step = 1; ; step++) {
                    int midR = r + step * dr;
                    int midC = c + step * dc;
                    if (midR < 0 || midR > 7 || midC < 0 || midC > 7) break;
                    String cap = board[midR][midC];
                    if (cap.isEmpty()) continue;
                    if (cap.equalsIgnoreCase(piece)) break; // own piece
                    // opponent piece found
                    // try landing positions beyond
                    for (int landStep = 1; ; landStep++) {
                        int landR = midR + landStep * dr;
                        int landC = midC + landStep * dc;
                        if (landR < 0 || landR > 7 || landC < 0 || landC > 7) break;
                        if (!board[landR][landC].isEmpty()) break; // blocked
                        String key = midR + "," + midC + "->" + landR + "," + landC;
                        if (used.contains(key)) continue;
                        used.add(key);
                        List<int[]> path = dfs(board, landR, landC, destR, destC, piece, used);
                        if (path != null) {
                            List<int[]> full = new ArrayList<>();
                            full.add(new int[]{midR, midC});
                            full.addAll(path);
                            return full;
                        }
                        used.remove(key);
                    }
                    // only first opponent can be captured
                    break;
                }
            } else {
                // Man: only adjacent capture
                int midR = r + dr;
                int midC = c + dc;
                int landR = r + 2 * dr;
                int landC = c + 2 * dc;
                if (landR < 0 || landR > 7 || landC < 0 || landC > 7) continue;
                String cap = board[midR][midC];
                if (cap.isEmpty() || cap.equalsIgnoreCase(piece)) continue;
                if (!board[landR][landC].isEmpty()) continue;
                String key = midR + "," + midC + "->" + landR + "," + landC;
                if (used.contains(key)) continue;
                used.add(key);
                List<int[]> path = dfs(board, landR, landC, destR, destC, piece, used);
                if (path != null) {
                    List<int[]> full = new ArrayList<>();
                    full.add(new int[]{midR, midC});
                    full.addAll(path);
                    return full;
                }
                used.remove(key);
            }
        }
        return null;
    }

    /**
     * Controlla se il team ha almeno una mossa (semplice o cattura).
     */
    private boolean hasAnyMoves(String[][] board, Team team) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                String cell = board[r][c];
                if (cell.isEmpty()) continue;
                boolean isWhite = cell.equalsIgnoreCase("w");
                if ((team == Team.WHITE) != isWhite) continue;
                // Cattura possibile?
                if (findCapturePath(board, r, c, r, c, cell) != null
                        && !findCapturePath(board, r, c, r, c, cell).isEmpty()) {
                    return true;
                }
                // Mossa semplice possibile?
                if (Character.isUpperCase(cell.charAt(0))) {
                    // Dama: diagonale libera di almeno 1 passo
                    int[][] dirs = {{1,1},{1,-1},{-1,1},{-1,-1}};
                    for (int[] d: dirs) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr<0||nr>7||nc<0||nc>7) continue;
                        if (board[nr][nc].isEmpty()) return true;
                    }
                } else {
                    // Pedina: una mossa avanti
                    int dr = isWhite ? -1 : 1;
                    int[][] forward = {{dr,1},{dr,-1}};
                    for (int[] d: forward) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr<0||nr>7||nc<0||nc>7) continue;
                        if (board[nr][nc].isEmpty()) return true;
                    }
                }
            }
        }
        return false;
    }
}