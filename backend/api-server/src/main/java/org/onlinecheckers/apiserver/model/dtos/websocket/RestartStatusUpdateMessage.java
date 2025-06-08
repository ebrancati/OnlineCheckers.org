package org.onlinecheckers.apiserver.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Message sent by server to update restart status
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestartStatusUpdateMessage {
    private String type = "RESTART_STATUS_UPDATE";
    private Object restartStatus; // PlayerRestartStatus object
}