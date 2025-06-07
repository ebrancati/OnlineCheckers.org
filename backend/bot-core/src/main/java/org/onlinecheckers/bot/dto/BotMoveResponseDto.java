package org.onlinecheckers.bot.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Response DTO for bot move calculation
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class BotMoveResponseDto {
    private String from;
    private String to;
    private List<String> path;

    // Default constructor for Jackson
    public BotMoveResponseDto() {}

    public BotMoveResponseDto(String from, String to, List<String> path) {
        this.from = from;
        this.to = to;
        this.path = path;
    }

    // Getters and setters
    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public List<String> getPath() {
        return path;
    }

    public void setPath(List<String> path) {
        this.path = path;
    }
}