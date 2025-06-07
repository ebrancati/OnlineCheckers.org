package org.onlinecheckers.apiserver.exceptions;

public class ConvertErrorException extends RuntimeException {
    public ConvertErrorException(String message) {
        super(message);
    }
}