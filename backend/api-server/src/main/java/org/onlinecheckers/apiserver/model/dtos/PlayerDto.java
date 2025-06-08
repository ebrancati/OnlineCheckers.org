package org.onlinecheckers.apiserver.model.dtos;

public record PlayerDto(
    String nickname,
    String preferredTeam
) {
    public PlayerDto(String nickname) {
        this(nickname,null);
    }
}