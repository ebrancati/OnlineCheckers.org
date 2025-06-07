package org.onlinecheckers.botlambda.service;

import jakarta.enterprise.context.ApplicationScoped;
import org.onlinecheckers.bot.dto.BotMoveRequestDto;
import org.onlinecheckers.bot.dto.BotMoveResponseDto;
import org.onlinecheckers.bot.service.BotAlgorithm;
import org.jboss.logging.Logger;

@ApplicationScoped
public class BotService {

    private static final Logger LOG = Logger.getLogger(BotService.class);
    
    // Use the shared bot-core algorithm
    private final BotAlgorithm botAlgorithm = new BotAlgorithm();

    public BotMoveResponseDto calculateBestMove(BotMoveRequestDto request) {
        long startTime = System.currentTimeMillis();
        
        try {
            LOG.debugf("Starting bot move calculation for %s with difficulty %d", 
                       request.getPlayerColor(), request.getDifficulty());
            
            // Delegate to the shared algorithm
            BotMoveResponseDto response = botAlgorithm.calculateMove(request);
            
            long executionTime = System.currentTimeMillis() - startTime;
            LOG.debugf("Bot move calculated in %d ms: %s -> %s", 
                       executionTime, response.getFrom(), response.getTo());
            
            return response;
            
        } catch (Exception e) {
            LOG.errorf(e, "Error in calculateBestMove");
            throw new RuntimeException("Failed to calculate bot move", e);
        }
    }
}