package org.onlinecheckers.apiserver.controllers;

import org.onlinecheckers.apiserver.model.dtos.*;
import org.onlinecheckers.apiserver.model.entities.Game;
import org.onlinecheckers.apiserver.model.entities.Player;
import org.onlinecheckers.apiserver.model.entities.enums.Team;
import org.onlinecheckers.apiserver.model.mappers.GameMapper;
import org.onlinecheckers.apiserver.repositories.GameRepository;
import org.onlinecheckers.apiserver.repositories.PlayerRepository;
import org.onlinecheckers.apiserver.repositories.PlayerRestartRepository;
import org.onlinecheckers.apiserver.services.MoveService;
import org.onlinecheckers.apiserver.exceptions.SessionGameNotFoundException;
import org.onlinecheckers.apiserver.exceptions.UnauthorizedMoveException;
import org.onlinecheckers.apiserver.exceptions.UnauthorizedChatException;
import org.onlinecheckers.apiserver.exceptions.UnauthorizedResetException;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import java.util.List;

@RestController
@RequestMapping("/api/games")
public class SessionGameController {

    @Autowired
    GameRepository gameDao;

    @Autowired
    PlayerRepository pDao;

    @Autowired
    GameMapper gameMapper;

    @Autowired
    private MoveService moveService;

    @Autowired
    PlayerRestartRepository prdao;

    @GetMapping("/{id}")
    public GameAccessDto stateGame(@PathVariable String id, HttpServletRequest request) {
        Game game = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        String sessionId = getSessionId(request);
        
        // Determine user role based on session authorization
        String role = game.isSessionAuthorized(sessionId) ? "PLAYER" : "SPECTATOR";
        
        // Create message based on role
        String message = null;
        if (role.equals("SPECTATOR")) {
            message = "You are viewing this game as a spectator. You cannot make moves or chat.";
        }
        
        return new GameAccessDto(
            id,
            role,
            gameMapper.toDto(game),
            message
        );
    }

    @PostMapping("/create")
    public GameDto createGame(@RequestBody PlayerDto player, HttpServletRequest request) {
        Game game = new Game();
        game.setBoard(game.getBOARDINIT());
        game.setTurno(Team.WHITE); // The initial turn always goes to the white player
        game.setPedineB(12);
        game.setPedineW(12);
        game.setDamaW(0);
        game.setDamaB(0);
        game.setPartitaTerminata(false);
        game.setVincitore(Team.NONE);

        // Add creator's session to authorized sessions
        String sessionId = getSessionId(request);
        game.addAuthorizedSession(sessionId);
        
        // Store nickname in session for future reference
        storeNicknameInSession(request, player.nickname());

        List<Player> p = pDao.findByNickname(player.nickname());
        for (Player p1 : p) {
            if (p1.getGame() == null){
                // Assign team based on preference
                Team preferredTeam = Team.WHITE; // Default
                if (player.preferredTeam() != null) {
                    try {
                        preferredTeam = Team.valueOf(player.preferredTeam().toUpperCase());
                        // If NONE is specified, still use WHITE as default
                        if (preferredTeam == Team.NONE) {
                            preferredTeam = Team.WHITE;
                        }
                    } catch (IllegalArgumentException e) {
                        // If the preference is invalid, use WHITE
                        preferredTeam = Team.WHITE;
                    }
                }

                p1.setTeam(preferredTeam);
                game.addPlayer(p1);
                break;
            }
        }

        gameDao.save(game);
        return gameMapper.toDto(game);
    }

    @PostMapping("/join/{id}")
    public boolean joinGame(@PathVariable String id, @RequestBody PlayerDto player, HttpServletRequest request) {
        boolean success = true;
        Game g = gameDao.findById(id).orElse(null);
        if (g == null) {
            success = false;
            return success;
        }

        // Check if game already has 2 players
        if (g.getPlayers().size() >= 2) {
            // Game is full, user will be a spectator
            // Don't add them to authorized sessions
            return false; // They can still view as spectator via stateGame endpoint
        }

        // Add joiner's session to authorized sessions (only if game has space)
        String sessionId = getSessionId(request);
        g.addAuthorizedSession(sessionId);
        
        // Store nickname in session for future reference
        storeNicknameInSession(request, player.nickname());

        // Determine the opponent's team
        Team creatorTeam = g.getPlayers().isEmpty() ? Team.WHITE : g.getPlayers().get(0).getTeam();
        Team joinerTeam = (creatorTeam == Team.WHITE) ? Team.BLACK : Team.WHITE;

        // Check if the nickname is already in use and make it unique if necessary
        String nickname = player.nickname();
        List<String> existingNicknames = g.getPlayers().stream()
                .map(Player::getNickname)
                .toList();

        // If the nickname already exists, add a suffix "2"
        if (existingNicknames.contains(nickname)) {
            nickname = nickname + "2";

            // If nickname+2 also exists, continue to increment the number
            int suffix = 3;
            while (existingNicknames.contains(nickname)) {
                nickname = player.nickname() + suffix;
                suffix++;
            }
        }

        List<Player> p = pDao.findByNickname(player.nickname());
        for (Player p1 : p) {
            if (p1.getGame() == null) {
                p1.setNickname(nickname);
                p1.setTeam(joinerTeam);
                g.addPlayer(p1);
                break;
            }
        }

        String nicknameB = g.getPlayers().get(0).getTeam() == Team.BLACK ? g.getPlayers().get(0).getNickname() : g.getPlayers().get(1).getNickname();
        String nicknameW = g.getPlayers().get(0).getTeam() == Team.WHITE ? g.getPlayers().get(0).getNickname() : g.getPlayers().get(1).getNickname();
        PlayerRestartDto pRestart = new PlayerRestartDto(id,nicknameB,nicknameW,false,false);
        prdao.save(pRestart);

        gameDao.save(g);
        return success;
    }

    @GetMapping("/{id}/board")
    public GameDto getGame(@PathVariable String id) {
        Game g = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        GameDto gdto = gameMapper.toDto(g);
        return gdto;
    }

    @PostMapping("/{id}/move")
    public GameDto makeMove(@PathVariable String id, @RequestBody MoveDto move, HttpServletRequest request) {
        Game game = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        String sessionId = getSessionId(request);
        
        // Check if user is authorized to make moves
        if (game.isSpectator(sessionId)) {
            throw new UnauthorizedMoveException("Spectators cannot make moves. Only authorized players can move pieces.");
        }
        
        Game updated = moveService.makeMove(id, move);
        PlayerRestartDto pRestart = prdao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        pRestart.setRestartB(false);
        pRestart.setRestartW(false);
        prdao.save(pRestart);
        return gameMapper.toDto(updated);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteGame(@PathVariable String id) {
        try{
            pDao.deleteAllByGameId(id);
            prdao.deleteById(id);
            gameDao.deleteById(id);
        }catch (SessionGameNotFoundException e) {
            System.out.println("Players or session not found on session id: " +id);
        }
    }

    @PostMapping("/{id}/chat")
    public void chat(@PathVariable String id, @RequestBody MessageDto message, HttpServletRequest request) {
        Game g = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        String sessionId = getSessionId(request);
        
        // Check if user is authorized to send chat messages
        if (g.isSpectator(sessionId)) {
            throw new UnauthorizedChatException("Spectators cannot send chat messages. Only authorized players can chat.");
        }
        
        g.setChat(g.getChat() + "<b>" + message.player() + "</b>" + ": " + message.text() + "\n");
        gameDao.save(g);
    }

    @PostMapping("/{id}/reset")
    public void resetGame(@PathVariable String id, HttpServletRequest request) {
        Game g = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        String sessionId = getSessionId(request);
        
        // Check if user is authorized to reset the game
        if (g.isSpectator(sessionId)) {
            throw new UnauthorizedResetException("Spectators cannot reset the game. Only authorized players can reset.");
        }
        
        g.setBoard(g.getBOARDINIT());
        g.setTurno(Team.WHITE);
        g.setPedineB(12);
        g.setPedineW(12);
        g.setDamaW(0);
        g.setDamaB(0);
        g.setPartitaTerminata(false);
        g.setVincitore(Team.NONE);
        g.getCronologiaMosse().clear();

        gameDao.save(g);
    }

    /**
     * Get the HTTP session ID from the request
     * @param request The HTTP request
     * @return The session ID
     */
    private String getSessionId(HttpServletRequest request) {
        return request.getSession().getId();
    }

    /**
     * Get the nickname from the session or localStorage equivalent
     * In questo caso, usiamo localStorage dal frontend che viene passato nel body
     * @param request The HTTP request  
     * @return The user's nickname or null if not found
     */
    private String getUserNickname(HttpServletRequest request) {
        HttpSession session = request.getSession();
        // Potremmo salvare il nickname nella sessione durante la creazione/join
        return (String) session.getAttribute("nickname");
    }

    /**
     * Store nickname in the HTTP session
     * @param request The HTTP request
     * @param nickname The nickname to store
     */
    private void storeNicknameInSession(HttpServletRequest request, String nickname) {
        HttpSession session = request.getSession();
        session.setAttribute("nickname", nickname);
    }

    /**
     * Check if user is authorized to perform actions on the game
     * @param game The game to check
     * @param sessionId The session ID to verify
     * @return true if authorized, false if spectator
     */
    private boolean isUserAuthorized(Game game, String sessionId) {
        return game.isSessionAuthorized(sessionId);
    }
}