package org.onlinecheckers.backend.controllers;

import org.onlinecheckers.backend.model.dtos.BotMoveRequestDto;
import org.onlinecheckers.backend.model.dtos.BotMoveResponseDto;
import org.onlinecheckers.backend.model.dtos.services.BotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bot")
public class BotController {

    @Autowired
    private BotService botService;

    @Value("${bot.lambda.enabled:false}")
    private boolean useLambda;

    @PostMapping("/move")
    public BotMoveResponseDto calculateBotMove(@RequestBody BotMoveRequestDto request) {
        if (useLambda) {
            // Use Lambda for bot calculation
            return botService.calculateBotMoveLambda(request);
        } else {
            // Use local bot service (come prima)
            return botService.calculateBotMove(request);
        }
    }
}