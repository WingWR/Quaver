package com.quaver.boot.web;

import com.quaver.common.exception.BusinessException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException exception) {
        return ResponseEntity.status(exception.getStatus()).body(Map.of(
                "error", exception.getClass().getSimpleName(),
                "message", exception.getMessage()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "ValidationError",
                "message", exception.getBindingResult().getAllErrors().stream()
                        .findFirst()
                        .map(error -> error.getDefaultMessage() == null ? "Validation failed." : error.getDefaultMessage())
                        .orElse("Validation failed.")
        ));
    }

    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleRestClient(RestClientResponseException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of(
                "error", exception.getClass().getSimpleName(),
                "message", resolveRestClientMessage(exception)
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", exception.getClass().getSimpleName(),
                "message", exception.getMessage() == null ? "Internal server error." : exception.getMessage()
        ));
    }

    private String resolveRestClientMessage(RestClientResponseException exception) {
        String body = exception.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return exception.getMessage() == null ? "Remote service request failed." : exception.getMessage();
        }
        return body.length() > 500 ? body.substring(0, 500) : body;
    }
}
