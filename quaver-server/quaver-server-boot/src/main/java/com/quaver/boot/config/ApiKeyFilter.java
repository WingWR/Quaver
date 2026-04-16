package com.quaver.boot.config;

import com.quaver.common.config.QuaverSecurityProperties;
import com.quaver.common.exception.UnauthorizedException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    private final QuaverSecurityProperties securityProperties;

    public ApiKeyFilter(QuaverSecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        if (uri.contains("/spotify/auth/login") || uri.contains("/spotify/auth/callback")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!securityProperties.getBackendApiKey().isBlank()) {
            String actual = request.getHeader("x-api-key");
            if (!securityProperties.getBackendApiKey().equals(actual)) {
                throw new UnauthorizedException("Invalid backend API key.");
            }
        }

        if (uri.contains("/agent") && !securityProperties.getAgentApiKey().isBlank()) {
            String actualAgentKey = request.getHeader("x-agent-api-key");
            if (!securityProperties.getAgentApiKey().equals(actualAgentKey)) {
                throw new UnauthorizedException("Invalid agent API key.");
            }
        }

        filterChain.doFilter(request, response);
    }
}
