package org.onlinecheckers.backend.services;

import org.onlinecheckers.backend.model.dtos.PlayerDto;
import org.onlinecheckers.backend.model.entities.Player;
import org.onlinecheckers.backend.model.mappers.PlayerMapper;
import org.onlinecheckers.backend.repositories.PlayerRepository;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class PlayerService {

    @Autowired
    PlayerMapper pmapper;

    @Autowired
    PlayerRepository pdao;

    public Player createPlayer(PlayerDto playerDto) {
        Player p = new Player();

        p.setNickname(playerDto.nickname());
        p = pdao.save(p);

        return p;
    }
}