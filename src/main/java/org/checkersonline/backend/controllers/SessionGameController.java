package org.checkersonline.backend.controllers;


import org.checkersonline.backend.exceptions.PlayerNotFoundException;
import org.checkersonline.backend.exceptions.SessionGameNotFoundException;
import org.checkersonline.backend.model.daos.GameDao;
import org.checkersonline.backend.model.daos.PlayerDao;
import org.checkersonline.backend.model.dtos.GameDto;
import org.checkersonline.backend.model.dtos.MessageDto;
import org.checkersonline.backend.model.dtos.MoveDto;
import org.checkersonline.backend.model.dtos.PlayerDto;
import org.checkersonline.backend.model.dtos.mappers.GameMapper;
import org.checkersonline.backend.model.dtos.services.GameService;
import org.checkersonline.backend.model.dtos.services.MoveService;
import org.checkersonline.backend.model.entities.Game;
import org.checkersonline.backend.model.entities.Player;
import org.checkersonline.backend.model.entities.SessionGame;
import org.checkersonline.backend.model.entities.enums.Team;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/games")
public class SessionGameController {

    @Autowired
    GameDao gameDao;

    @Autowired
    PlayerDao pDao;


    @Autowired
    GameMapper gameMapper;

    @Autowired
    private MoveService moveService;


    @GetMapping("/{id}")
    public Game stateGame(@PathVariable String id) {
        return gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
    }

    @PostMapping("/create")
    public GameDto createGame(@RequestBody PlayerDto player) {
        Game game = new Game();
        game.setBoard(game.getBOARDINIT());
        game.setTurno(Team.WHITE);
        game.setPedineB(12);
        game.setPedineW(12);
        game.setDamaW(0);
        game.setDamaB(0);
        game.setPartitaTerminata(false);
        game.setVincitore(Team.NONE);
        List<Player> p = pDao.findByNickname(player.nickname());
        for (Player p1 : p) {
            if (p1.getGame() == null){
                p1.setTeam(Team.WHITE);
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

        List<Player> p = pDao.findByNickname(player.nickname());
        for (Player p1 : p) {
            if (p1.getGame() == null) {
                p1.setTeam(Team.BLACK);
                g.addPlayer(p1);
                break;
            }
        }

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
        return gameMapper.toDto(updated);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteGame(@PathVariable String id) {
        try{
            pDao.deleteAllByGameId(id);
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
        gameDao.save(g);
    }


}
