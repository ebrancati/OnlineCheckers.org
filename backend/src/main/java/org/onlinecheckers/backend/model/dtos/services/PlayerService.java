package org.onlinecheckers.backend.model.dtos.services;

import org.onlinecheckers.backend.model.daos.PlayerDao;
import org.onlinecheckers.backend.model.dtos.PlayerDto;
import org.onlinecheckers.backend.model.dtos.mappers.PlayerMapper;
import org.onlinecheckers.backend.model.entities.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PlayerService {

    @Autowired
    PlayerMapper pmapper;

    @Autowired
    PlayerDao pdao;

    public Player createPlayer(PlayerDto playerDto) {
        Player p = new Player();

        p.setNickname(playerDto.nickname());
        p = pdao.save(p);

        return p;
    }
}