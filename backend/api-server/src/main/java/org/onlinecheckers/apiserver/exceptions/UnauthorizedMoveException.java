package org.onlinecheckers.apiserver.exceptions;

import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedMoveException extends RuntimeException {
    public UnauthorizedMoveException(String message) {
        super(message);
    }
}