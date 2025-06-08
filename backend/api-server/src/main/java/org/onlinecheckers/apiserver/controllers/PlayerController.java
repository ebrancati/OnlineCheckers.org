package org.onlinecheckers.apiserver.controllers;

import org.onlinecheckers.apiserver.model.dtos.PlayerDto;
import org.onlinecheckers.apiserver.model.entities.Player;
import org.onlinecheckers.apiserver.repositories.PlayerRepository;
import org.onlinecheckers.apiserver.services.PlayerService;

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