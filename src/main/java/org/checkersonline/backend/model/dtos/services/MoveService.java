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
        Game game = gameDao.findById(gameId)
                .orElseThrow(() -> new SessionGameNotFoundException(gameId));
        Team player = Team.valueOf(dto.getPlayer().toUpperCase());
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
        boolean isCapture = Math.abs(dr) > 1;
        if (isCapture) {
            List<int[]> captured = findCapturePath(board, fromR, fromC, toR, toC, piece);
            if (captured == null) {
                throw new InvalidMoveException("Invalid capture path.");
            }
            // Remove captured pieces
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
            // Simple move
            if (Math.abs(dr) != 1 || Math.abs(dc) != 1) {
                throw new InvalidMoveException("Invalid simple move.");
            }
            // Men move only forward
            if (piece.equals("w") && dr != -1) {
                throw new InvalidMoveException("White man can only move forward.");
            }
            if (piece.equals("b") && dr != 1) {
                throw new InvalidMoveException("Black man can only move forward.");
            }
        }

        // Perform move
        board[fromR][fromC] = "";
        // Promotion
        boolean promoted = false;
        if (piece.equals("w") && toR == 0) {
            piece = "W";
            promoted = true;
            game.setPedineW(game.getPedineW() - 1);
            game.setDamaW(game.getDamaW() + 1);
        }
        if (piece.equals("b") && toR == 7) {
            piece = "B";
            promoted = true;
            game.setPedineB(game.getPedineB() - 1);
            game.setDamaB(game.getDamaB() + 1);
        }
        board[toR][toC] = piece;

        // Switch turn
        game.setTurno(player == Team.WHITE ? Team.BLACK : Team.WHITE);

        // Check game end
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
        int[][] dirs;
        if (Character.isUpperCase(pchar)) {
            dirs = new int[][] {{1,1},{1,-1},{-1,1},{-1,-1}};
        } else if (piece.equals("w")) {
            dirs = new int[][] {{-1,-1},{-1,1}};
        } else {
            dirs = new int[][] {{1,-1},{1,1}};
        }
        for (int[] d : dirs) {
            int midR = r + d[0], midC = c + d[1];
            int landR = r + 2*d[0], landC = c + 2*d[1];
            if (landR < 0 || landR > 7 || landC < 0 || landC > 7) continue;
            String cap = board[midR][midC];
            if (cap.isEmpty() || cap.equalsIgnoreCase(piece)) continue;
            if (!board[landR][landC].isEmpty()) continue;
            String key = midR+","+midC+"->"+landR+","+landC;
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
        return null;
    }
}