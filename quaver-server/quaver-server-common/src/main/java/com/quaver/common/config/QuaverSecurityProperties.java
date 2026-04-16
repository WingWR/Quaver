package com.quaver.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quaver.security")
public class QuaverSecurityProperties {

    private String backendApiKey = "";
    private String agentApiKey = "";

    public String getBackendApiKey() {
        return backendApiKey;
    }

    public void setBackendApiKey(String backendApiKey) {
        this.backendApiKey = backendApiKey;
    }

    public String getAgentApiKey() {
        return agentApiKey;
    }

    public void setAgentApiKey(String agentApiKey) {
        this.agentApiKey = agentApiKey;
    }
}
