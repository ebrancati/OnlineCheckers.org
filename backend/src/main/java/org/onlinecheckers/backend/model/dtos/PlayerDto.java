package org.onlinecheckers.backend.model.dtos;

public record PlayerDto(
    String nickname,
    String preferredTeam
) {
    public PlayerDto(String nickname) {
        this(nickname,null);
    }
}