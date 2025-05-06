package org.checkersonline.backend.controllers;


import org.checkersonline.backend.exceptions.SessionGameNotFoundException;
import org.checkersonline.backend.model.daos.GameDao;
import org.checkersonline.backend.model.daos.PlayerDao;
import org.checkersonline.backend.model.dtos.GameDto;
import org.checkersonline.backend.model.dtos.PlayerDto;
import org.checkersonline.backend.model.dtos.mappers.GameMapper;
import org.checkersonline.backend.model.dtos.services.GameService;
import org.checkersonline.backend.model.entities.Game;
import org.checkersonline.backend.model.entities.Player;
import org.checkersonline.backend.model.entities.SessionGame;
import org.checkersonline.backend.model.entities.enums.Team;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/games")
public class SessionGameController {

    @Autowired
    GameDao gameDao;

    @Autowired
    PlayerDao pDao;


    @Autowired
    GameMapper gameMapper;


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
        Player p = pDao.findByNickname(player.nickname());
        game.addPlayer(p);
        gameDao.save(game);

        return gameMapper.toDto(game);
    }

    @PostMapping("/join/{id}")
    public boolean joinGame(@PathVariable String id, @RequestBody PlayerDto player) {

        boolean success = true;
        Game g = gameDao.findById(id).orElse(null);
        if (g == null) {
            success = false;
            throw new SessionGameNotFoundException("Game not found");
        }


        g.addPlayer(pDao.findByNickname(player.nickname()));
        gameDao.save(g);
        return success;
    }

    @GetMapping("/{id}/board")
    public GameDto getGame(@PathVariable String id) {
        Game g = gameDao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        GameDto gdto = gameMapper.toDto(g);
        return gdto;
    }


}
