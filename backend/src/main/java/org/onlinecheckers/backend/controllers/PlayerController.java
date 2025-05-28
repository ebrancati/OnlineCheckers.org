package org.onlinecheckers.backend.controllers;

import org.onlinecheckers.backend.model.daos.PlayerDao;
import org.onlinecheckers.backend.model.dtos.PlayerDto;
import org.onlinecheckers.backend.model.dtos.services.PlayerService;
import org.onlinecheckers.backend.model.entities.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    PlayerDao pDao;

    @Autowired
    PlayerService pService;

    @PostMapping("/create")
    public Player createPlayer(@RequestBody PlayerDto p) {
        return pService.createPlayer(p);
    }
}