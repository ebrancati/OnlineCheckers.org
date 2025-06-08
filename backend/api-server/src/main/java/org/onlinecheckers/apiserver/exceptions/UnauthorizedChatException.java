package org.onlinecheckers.apiserver.exceptions;

import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedChatException extends RuntimeException {
    public UnauthorizedChatException(String message) {
        super(message);
    }
}