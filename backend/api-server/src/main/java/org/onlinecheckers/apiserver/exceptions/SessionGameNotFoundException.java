package org.onlinecheckers.apiserver.exceptions;

public class SessionGameNotFoundException extends RuntimeException {
    public SessionGameNotFoundException(String message) {
        super(message);
    }
}