package org.checkersonline.backend.controllers;


import org.checkersonline.backend.exceptions.SessionGameNotFoundException;
import org.checkersonline.backend.model.daos.GameDao;
import org.checkersonline.backend.model.daos.PlayerRestartDao;
import org.checkersonline.backend.model.dtos.PlayerDto;
import org.checkersonline.backend.model.dtos.PlayerRestartDto;
import org.checkersonline.backend.model.entities.Game;
import org.checkersonline.backend.model.entities.enums.Team;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/restartStatus")
public class RestartController {

    @Autowired
    GameDao gameDao;

    @Autowired
    PlayerRestartDao prdao;



    @GetMapping("/{id}/")
    public PlayerRestartDto statusRestart(@PathVariable String id) {
        return prdao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
    }

    @PostMapping("/{id}")
    public void statusRestartUpdate(@PathVariable String id, @RequestBody PlayerRestartDto playerStatus) {
        prdao.save(playerStatus);
    }
}
