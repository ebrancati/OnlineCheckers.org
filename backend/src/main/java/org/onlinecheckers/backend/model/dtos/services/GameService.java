package org.onlinecheckers.backend.model.dtos.services;

import org.onlinecheckers.backend.exceptions.SessionGameNotFoundException;
import org.onlinecheckers.backend.model.daos.GameDao;
import org.onlinecheckers.backend.model.dtos.GameDto;
import org.onlinecheckers.backend.model.dtos.mappers.GameMapper;
import org.onlinecheckers.backend.model.entities.Game;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GameService {

    @Autowired
    GameMapper gameMapper;

    @Autowired
    GameDao gameDao;

    public Game createGame(GameDto gameDto) {
        Game g = new Game();
        
        g.setId(gameDto.id());
        g.setBoard(gameDto.board());
        g.setTurno(gameDto.turno());
        g.setPedineW(gameDto.pedineW());
        g.setPedineB(gameDto.pedineB());
        g.setDamaW(gameDto.damaW());
        g.setDamaB(gameDto.damaB());
        g.setPartitaTerminata(gameDto.partitaTerminata());
        g.setVincitore(gameDto.vincitore());
        g.setPlayers(gameDto.players());

        return gameDao.save(g);
    }

    public GameDto getGame(String id) {
        Game g = gameDao.findById(id).orElse(null);
        if (g == null) {
            throw new SessionGameNotFoundException("Game with id " + id + " not found");
        }
        return gameMapper.toDto(g);
    }
}