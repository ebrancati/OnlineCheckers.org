package org.onlinecheckers.backend.controllers;

import org.onlinecheckers.backend.model.dtos.*;
import org.onlinecheckers.backend.model.entities.Game;
import org.onlinecheckers.backend.model.entities.Player;
import org.onlinecheckers.backend.model.entities.enums.Team;
import org.onlinecheckers.backend.model.mappers.GameMapper;
import org.onlinecheckers.backend.repositories.GameRepository;
import org.onlinecheckers.backend.repositories.PlayerRepository;
import org.onlinecheckers.backend.repositories.PlayerRestartRepository;
import org.onlinecheckers.backend.services.MoveService;
import org.onlinecheckers.backend.exceptions.SessionGameNotFoundException;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

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
    public Game stateGame(@PathVariable String id) {
        return gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
    }

    @PostMapping("/create")
    public GameDto createGame(@RequestBody PlayerDto player) {
        Game game = new Game();
        game.setBoard(game.getBOARDINIT());
        game.setTurno(Team.WHITE); // The initial turn always goes to the white player
        game.setPedineB(12);
        game.setPedineW(12);
        game.setDamaW(0);
        game.setDamaB(0);
        game.setPartitaTerminata(false);
        game.setVincitore(Team.NONE);

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
    public boolean joinGame(@PathVariable String id, @RequestBody PlayerDto player) {
        boolean success = true;
        Game g = gameDao.findById(id).orElse(null);
        if (g == null) {
            success = false;
            return success;
        }

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
    public GameDto makeMove(@PathVariable String id, @RequestBody MoveDto move) {
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
    public void chat(@PathVariable String id, @RequestBody MessageDto message) {
        Game g = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        g.setChat(g.getChat() + "<b>" + message.player() + "</b>" + ": " + message.text() + "\n");
        gameDao.save(g);
    }

    @PostMapping("/{id}/reset")
    public void resetGame(@PathVariable String id) {
        Game g = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        
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
}