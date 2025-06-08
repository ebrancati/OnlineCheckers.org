package org.onlinecheckers.apiserver.exceptions;

import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedResetException extends RuntimeException {
    public UnauthorizedResetException(String message) {
        super(message);
    }
}