package org.checkersonline.backend.controllers;


import org.checkersonline.backend.model.daos.PlayerDao;
import org.checkersonline.backend.model.dtos.PlayerDto;
import org.checkersonline.backend.model.dtos.services.PlayerService;
import org.checkersonline.backend.model.entities.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    PlayerDao pDao;

    @Autowired
    PlayerService pService;

    @GetMapping("/{id}")
    public PlayerDto getPlayer(@PathVariable("id") String id) {

        return pDao.findById(id)
                .map(p -> pService.getPlayer(p.getNickname())).orElse(null);
    }

    @PostMapping("/create")
    public Player createPlayer(@RequestBody PlayerDto p) {
        return pService.createPlayer(p);
    }



}
