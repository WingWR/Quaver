package com.quaver.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quaver.ai")
public class QuaverAiProperties {

    private String apiKey = "";
    private String model = "deepseek-v4-pro";
    private String searchModel = "deepseek-v4-pro";
    private String agentModel = "deepseek-v4-pro";
    private String baseUrl = "https://api.deepseek.com";

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
        if (model != null && !model.isBlank()) {
            this.agentModel = model;
        }
    }

    public String getSearchModel() {
        return searchModel;
    }

    public void setSearchModel(String searchModel) {
        this.searchModel = searchModel;
    }

    public String getAgentModel() {
        return agentModel == null || agentModel.isBlank() ? model : agentModel;
    }

    public void setAgentModel(String agentModel) {
        this.agentModel = agentModel;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }
}
