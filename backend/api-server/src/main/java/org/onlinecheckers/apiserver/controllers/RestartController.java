package org.onlinecheckers.apiserver.controllers;

import org.onlinecheckers.apiserver.model.dtos.PlayerRestartDto;
import org.onlinecheckers.apiserver.repositories.GameRepository;
import org.onlinecheckers.apiserver.repositories.PlayerRestartRepository;
import org.onlinecheckers.apiserver.exceptions.SessionGameNotFoundException;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/restartStatus")
public class RestartController {

    @Autowired
    GameRepository gameDao;

    @Autowired
    PlayerRestartRepository prdao;

    @GetMapping("/{id}/")
    public PlayerRestartDto statusRestart(@PathVariable String id) {
        return prdao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
    }

    @PostMapping("/{id}")
    public void statusRestartUpdate(@PathVariable String id, @RequestBody PlayerRestartDto playerStatus) {
        prdao.save(playerStatus);
    }

    @PostMapping("/{id}/restart")
    public PlayerRestartDto restart(@PathVariable String id) {
        PlayerRestartDto pRestart = prdao.findById(id).orElseThrow(() -> new SessionGameNotFoundException(id));
        pRestart.setRestartB(false);
        pRestart.setRestartW(false);
        return prdao.save(pRestart);
    }
}