package com.quaver.boot;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = "com.quaver")
@ConfigurationPropertiesScan(basePackages = "com.quaver")
@MapperScan(basePackages = {
        "com.quaver.common.identity.mapper",
        "com.quaver.spotify.mapper",
        "com.quaver.library.mapper"
})
public class QuaverServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(QuaverServerApplication.class, args);
    }
}
