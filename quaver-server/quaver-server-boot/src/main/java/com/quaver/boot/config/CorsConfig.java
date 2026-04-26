package com.quaver.boot.config;

import com.quaver.common.config.QuaverFrontendProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final QuaverFrontendProperties frontendProperties;

    public CorsConfig(QuaverFrontendProperties frontendProperties) {
        this.frontendProperties = frontendProperties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] allowedOrigins = frontendProperties.getAllowedOrigins() == null
                || frontendProperties.getAllowedOrigins().isEmpty()
                ? new String[]{frontendProperties.getBaseUrl()}
                : frontendProperties.getAllowedOrigins().toArray(String[]::new);

        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
