package org.checkersonline.backend.controllers;


import org.checkersonline.backend.model.dao.PlayerDao;
import org.checkersonline.backend.model.entities.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    PlayerDao pDao;

    @GetMapping("/{id}")
    public Player getPlayer(@PathVariable("id") String id) {
        Player p = pDao.findById(id).orElse(null);
        return p;
    }

    @PostMapping("/create")
    public Player createPlayer(@RequestBody Player p) {
        return pDao.save(p);
    }



}
