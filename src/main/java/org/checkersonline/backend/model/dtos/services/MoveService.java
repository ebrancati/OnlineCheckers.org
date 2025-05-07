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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class MoveService {
    @Autowired
    private GameDao gameDao;

    public Game makeMove(String gameId, MoveDto dto) {
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
        int fromR = Character.getNumericValue(dto.getFrom().charAt(0));
        int fromC = Character.getNumericValue(dto.getFrom().charAt(1));
        int toR   = Character.getNumericValue(dto.getTo().charAt(0));
        int toC   = Character.getNumericValue(dto.getTo().charAt(1));
        validateCoordinates(fromR, fromC);
        validateCoordinates(toR, toC);

        String piece = board[fromR][fromC];
        if (piece.isEmpty()) {
            throw new InvalidMoveException("No piece at position " + dto.getFrom());
        }
        boolean isWhitePiece = piece.equalsIgnoreCase("w");
        if ((player == Team.WHITE) != isWhitePiece) {
            throw new InvalidMoveException("Piece does not belong to player.");
        }
        if (!board[toR][toC].isEmpty()) {
            throw new InvalidMoveException("Destination " + dto.getTo() + " is not empty.");
        }

        int dr = toR - fromR;
        int dc = toC - fromC;

        // 1) Proviamo a trovare un percorso di cattura (anche multipla, anche con cambi di direzione)
        List<int[]> captured = findCapturePath(board, fromR, fromC, toR, toC, piece);
        boolean isCapture = captured != null && !captured.isEmpty();

        if (isCapture) {
            // Rimuovo tutte le pedine intercettate
            for (int[] pos : captured) {
                int r = pos[0], c = pos[1];
                String cap = board[r][c];
                board[r][c] = "";
                if (cap.equalsIgnoreCase("w")) {
                    if (cap.equals("w")) game.setPedineW(game.getPedineW() - 1);
                    else                game.setDamaW(game.getDamaW() - 1);
                } else {
                    if (cap.equals("b")) game.setPedineB(game.getPedineB() - 1);
                    else                game.setDamaB(game.getDamaB() - 1);
                }
            }
        } else {
            // Mossa semplice
            if (Character.isUpperCase(piece.charAt(0))) {
                // Dama: può muoversi di qualsiasi lunghezza lungo la diagonale
                if (Math.abs(dr) != Math.abs(dc) || dr == 0) {
                    throw new InvalidMoveException("Invalid simple move for king.");
                }
                // Verifica che non ci siano pedine intermedie
                int stepR = dr / Math.abs(dr);
                int stepC = dc / Math.abs(dc);
                for (int i = 1; i < Math.abs(dr); i++) {
                    if (!board[fromR + i*stepR][fromC + i*stepC].isEmpty()) {
                        throw new InvalidMoveException("Path is blocked for king move.");
                    }
                }
            } else {
                // Uomo: salto di un passo solo
                if (Math.abs(dr) != 1 || Math.abs(dc) != 1) {
                    throw new InvalidMoveException("Invalid simple move.");
                }
                // Uomo muove solo avanti
                if (piece.equals("w") && dr != -1) {
                    throw new InvalidMoveException("White man can only move forward.");
                }
                if (piece.equals("b") && dr != 1) {
                    throw new InvalidMoveException("Black man can only move forward.");
                }
            }
        }

        // 2) Sposta la pedina
        board[fromR][fromC] = "";
        boolean promoted = false;
        if (piece.equals("w") && toR == 0) {
            piece = "W"; promoted = true;
            game.setPedineW(game.getPedineW() - 1);
            game.setDamaW(game.getDamaW() + 1);
        }
        if (piece.equals("b") && toR == 7) {
            piece = "B"; promoted = true;
            game.setPedineB(game.getPedineB() - 1);
            game.setDamaB(game.getDamaB() + 1);
        }
        board[toR][toC] = piece;

        // 3) Cambio turno
        game.setTurno(player == Team.WHITE ? Team.BLACK : Team.WHITE);

        // 4) Check fine partita
        if (game.getPedineW() + game.getDamaW() == 0) {
            game.setPartitaTerminata(true);
            game.setVincitore(Team.BLACK);
        }
        if (game.getPedineB() + game.getDamaB() == 0) {
            game.setPartitaTerminata(true);
            game.setVincitore(Team.WHITE);
        }

        return gameDao.save(game);
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
}