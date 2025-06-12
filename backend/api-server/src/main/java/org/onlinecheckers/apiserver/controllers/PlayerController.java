package org.onlinecheckers.apiserver.controllers;

import org.onlinecheckers.apiserver.model.dtos.PlayerDto;
import org.onlinecheckers.apiserver.model.entities.Player;
import org.onlinecheckers.apiserver.repositories.PlayerRepository;
import org.onlinecheckers.apiserver.services.PlayerService;
import org.onlinecheckers.apiserver.services.NicknameValidationService;
import org.onlinecheckers.apiserver.services.NicknameValidationService.NicknameValidationResult;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.util.Map;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    PlayerRepository pDao;

    @Autowired
    PlayerService pService;
    
    @Autowired
    NicknameValidationService nicknameValidationService;

    @PostMapping("/create")
    public ResponseEntity<?> createPlayer(@RequestBody PlayerDto p) {
        try {
            // Validate nickname before creating player
            NicknameValidationResult validationResult = nicknameValidationService.validateNickname(p.nickname());
            
            if (!validationResult.isValid()) {
                // Return validation error to frontend
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "errorCode", validationResult.getErrorCode(),
                    "message", validationResult.getErrorMessage()
                ));
            }
            
            // Nickname is valid, proceed with player creation
            Player createdPlayer = pService.createPlayer(p);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "player", createdPlayer
            ));
            
        } catch (Exception e) {
            // Log the error for debugging
            System.err.println("Error creating player: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "errorCode", "SERVER_ERROR",
                "message", "An error occurred while creating the player"
            ));
        }
    }
    
    /**
     * Endpoint to validate a nickname without creating a player
     * Useful for real-time validation in the frontend
     */
    @PostMapping("/validate-nickname")
    public ResponseEntity<?> validateNickname(@RequestBody Map<String, String> request) {
        try {
            String nickname = request.get("nickname");
            
            if (nickname == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "valid", false,
                    "errorCode", "MISSING_NICKNAME",
                    "message", "Nickname is required"
                ));
            }
            
            NicknameValidationResult result = nicknameValidationService.validateNickname(nickname);
            
            if (result.isValid()) {
                return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "message", "Nickname is valid"
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "errorCode", result.getErrorCode(),
                    "message", result.getErrorMessage()
                ));
            }
            
        } catch (Exception e) {
            System.err.println("Error validating nickname: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "valid", false,
                "errorCode", "SERVER_ERROR",
                "message", "An error occurred while validating the nickname"
            ));
        }
    }
}