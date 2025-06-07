package org.onlinecheckers.apiserver.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Message sent by server to notify errors
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorMessage {
    private String type = "ERROR";
    private String message;
    private String code;
}