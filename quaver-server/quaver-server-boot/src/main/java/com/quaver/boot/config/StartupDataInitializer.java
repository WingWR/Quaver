package com.quaver.boot.config;

import com.quaver.common.identity.UserContextService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class StartupDataInitializer implements ApplicationRunner {

    private final UserContextService userContextService;

    public StartupDataInitializer(UserContextService userContextService) {
        this.userContextService = userContextService;
    }

    @Override
    public void run(ApplicationArguments args) {
        userContextService.ensureDefaultUser();
    }
}
