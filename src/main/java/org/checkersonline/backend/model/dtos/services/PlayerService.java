package org.checkersonline.backend.model.dtos.services;

import org.checkersonline.backend.exceptions.PlayerNotFoundException;
import org.checkersonline.backend.model.daos.PlayerDao;
import org.checkersonline.backend.model.dtos.PlayerDto;
import org.checkersonline.backend.model.dtos.mappers.PlayerMapper;
import org.checkersonline.backend.model.entities.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class PlayerService {

    @Autowired
    PlayerMapper pmapper;

    @Autowired
    PlayerDao pdao;

    public PlayerDto getPlayer(String nickname) {
        Player p = pdao.findByNickname(nickname);
        if (p == null) {
            throw new PlayerNotFoundException(nickname + " not found");
        }
        return pmapper.toDto(p);
    }

    public Player createPlayer(PlayerDto playerDto) {
        Player p = new Player();
        p.setNickname(playerDto.nickname());
        p = pdao.save(p);
        return p;

    }

}
