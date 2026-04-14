package com.bpm.inteligente.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String recurso, String campo, String valor) {
        super(String.format("%s no encontrado con %s: '%s'", recurso, campo, valor));
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
