package org.onlinecheckers.backend.model.dtos;

import org.onlinecheckers.backend.model.entities.Player;
import org.onlinecheckers.backend.model.entities.enums.Team;

import java.util.List;

public record GameDto(
    String id,
    String[][] board,
    Team turno,
    int pedineW,
    int pedineB,
    int damaW,
    int damaB,
    boolean partitaTerminata,
    Team vincitore,
    List<Player> players,
    List<String> lastMultiCapturePath
) {}