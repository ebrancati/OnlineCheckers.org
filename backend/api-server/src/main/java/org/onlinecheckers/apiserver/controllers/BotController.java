package org.onlinecheckers.apiserver.controllers;

import org.onlinecheckers.bot.dto.BotMoveRequestDto;
import org.onlinecheckers.bot.dto.BotMoveResponseDto;
import org.onlinecheckers.apiserver.services.BotService;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

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
            // Use local bot service
            return botService.calculateBotMove(request);
        }
    }
}