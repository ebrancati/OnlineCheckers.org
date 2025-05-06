package org.checkersonline.backend.controllers;


import org.checkersonline.backend.exceptions.SessionGameNotFound;
import org.checkersonline.backend.model.dao.GameDao;
import org.checkersonline.backend.model.dao.PlayerDao;
import org.checkersonline.backend.model.dao.SessionGameDao;
import org.checkersonline.backend.model.entities.Game;
import org.checkersonline.backend.model.entities.Player;
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

    @PostMapping("/create")
    public Game createGame(@RequestBody String nickname) {
        Game game = new Game();
        game.setBoard(game.getBOARDINIT());
        game.setTurno(Team.WHITE);
        game.setPedineB(12);
        game.setPedineW(12);
        game.setDamaW(0);
        game.setDamaB(0);
        game.setPartitaTerminata(false);
        game.setVincitore(Team.NONE);
        game.addPlayer(pDao.findByNickname(nickname));
        gameDao.save(game);

        return game;
    }

    @PostMapping("/join/{id}")
    public Game joinGame(@PathVariable String id, @RequestBody String nickname) {

        Game g = gameDao.findById(id).orElse(null);
        if (g == null) {
            throw new SessionGameNotFound("Game not found");
        }

        g.addPlayer(pDao.findByNickname(nickname));
        gameDao.save(g);
        return g;

    }


}
