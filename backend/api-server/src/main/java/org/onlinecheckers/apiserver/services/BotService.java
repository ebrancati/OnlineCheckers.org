package org.onlinecheckers.apiserver.services;

import org.onlinecheckers.bot.dto.BotMoveRequestDto;
import org.onlinecheckers.bot.dto.BotMoveResponseDto;
import org.onlinecheckers.bot.service.BotAlgorithm;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

@Service
public class BotService {

    @Value("${bot.lambda.url:}")
    private String lambdaUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final BotAlgorithm botAlgorithm = new BotAlgorithm();

    /**
     * Calculate bot move using AWS Lambda
     */
    public BotMoveResponseDto calculateBotMoveLambda(BotMoveRequestDto request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<BotMoveRequestDto> entity = new HttpEntity<>(request, headers);

            String endpoint = lambdaUrl + "/bot/move";
            ResponseEntity<BotMoveResponseDto> response = restTemplate.exchange(
                    endpoint, HttpMethod.POST, entity, BotMoveResponseDto.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            } else {
                // Fallback to local implementation
                return calculateBotMove(request);
            }
        } catch (Exception e) {
            System.err.println("Lambda call failed: " + e.getMessage());
            // Fallback to local implementation
            return calculateBotMove(request);
        }
    }

    /**
     * Calculate bot move using local bot-core library
     */
    public BotMoveResponseDto calculateBotMove(BotMoveRequestDto request) {
        return botAlgorithm.calculateMove(request);
    }
}