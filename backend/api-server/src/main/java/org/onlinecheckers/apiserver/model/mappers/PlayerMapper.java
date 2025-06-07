package org.onlinecheckers.apiserver.model.mappers;

import org.onlinecheckers.apiserver.model.dtos.PlayerDto;
import org.onlinecheckers.apiserver.model.entities.Player;

import org.springframework.stereotype.Service;

@Service
public class PlayerMapper {

    public PlayerDto toDto(Player player) {
        return new PlayerDto(player.getNickname());
    }
}