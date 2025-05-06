package org.checkersonline.backend.exceptions;

public class SessionGameNotFound extends RuntimeException {
    public SessionGameNotFound(String message) {
        super(message);
    }
}
