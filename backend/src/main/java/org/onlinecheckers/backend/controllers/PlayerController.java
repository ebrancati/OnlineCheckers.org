package org.onlinecheckers.backend.controllers;

import org.onlinecheckers.backend.model.dtos.PlayerDto;
import org.onlinecheckers.backend.model.entities.Player;
import org.onlinecheckers.backend.repositories.PlayerRepository;
import org.onlinecheckers.backend.services.PlayerService;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    PlayerRepository pDao;

    @Autowired
    PlayerService pService;

    @PostMapping("/create")
    public Player createPlayer(@RequestBody PlayerDto p) {
        return pService.createPlayer(p);
    }
}