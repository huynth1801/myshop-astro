package com.shop.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Boot 4's web starter no longer auto-configures a RestClient.Builder bean, but
 * constructor injection keeps the client unit-testable via MockRestServiceServer
 * (see GoogleOAuthClientTest) — so provide one explicitly.
 */
@Configuration
public class RestClientConfig {

    @Bean
    RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }
}
