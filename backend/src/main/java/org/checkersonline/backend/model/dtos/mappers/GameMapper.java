package org.checkersonline.backend.model.dtos.mappers;


import org.checkersonline.backend.model.dtos.GameDto;
import org.checkersonline.backend.model.entities.Game;
import org.springframework.stereotype.Service;

@Service
public class GameMapper {

    public GameDto toDto(Game game) {
        return new GameDto(
                game.getId(),
                game.getBoard(),
                game.getTurno(),
                game.getPedineW(),
                game.getPedineB(),
                game.getDamaW(),
                game.getDamaB(),
                game.isPartitaTerminata(),
                game.getVincitore(),
                game.getPlayers(),
                game.getLastMultiCapturePath()
        );
    }
}
