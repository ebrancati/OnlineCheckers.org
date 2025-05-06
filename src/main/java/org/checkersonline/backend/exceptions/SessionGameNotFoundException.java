package org.checkersonline.backend.exceptions;

public class SessionGameNotFoundException extends RuntimeException {
    public SessionGameNotFoundException(String message) {
        super(message);
    }
}
