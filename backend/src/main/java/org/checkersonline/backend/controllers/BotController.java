package org.checkersonline.backend.controllers;

import org.checkersonline.backend.model.dtos.BotMoveRequestDto;
import org.checkersonline.backend.model.dtos.BotMoveResponseDto;
import org.checkersonline.backend.model.dtos.services.BotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bot")
public class BotController {

    @Autowired
    private BotService botService;

    @PostMapping("/move")
    public BotMoveResponseDto calculateBotMove(@RequestBody BotMoveRequestDto request) {
        return botService.calculateBotMove(request);
    }
}