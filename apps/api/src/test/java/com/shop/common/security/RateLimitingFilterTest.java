package com.shop.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitingFilterTest {

    private RateLimitingFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter(true);
        chain = mock(FilterChain.class);
    }

    @Test
    void normalGetRequest_passesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/products");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void loginEndpoint_allowsUpToLimitThenRejectsWith429() throws ServletException, IOException {
        // Login limit is 5 requests per minute
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr("192.168.1.100");
            MockHttpServletResponse res = new MockHttpServletResponse();

            filter.doFilterInternal(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 6th request should hit 429
        MockHttpServletRequest req6 = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        req6.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse res6 = new MockHttpServletResponse();

        filter.doFilterInternal(req6, res6, chain);

        assertThat(res6.getStatus()).isEqualTo(429);
        assertThat(res6.getHeader("Retry-After")).isEqualTo("60");
        assertThat(res6.getContentAsString()).contains("TOO_MANY_REQUESTS");
    }

    @Test
    void usesCfConnectingIpHeaderWhenPresent() throws ServletException, IOException {
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/register");
            req.addHeader("CF-Connecting-IP", "203.0.113.195");
            req.setRemoteAddr("127.0.0.1"); // Cloudflare proxy IP
            MockHttpServletResponse res = new MockHttpServletResponse();

            filter.doFilterInternal(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 4th request from same CF IP gets rate limited (Register limit = 3)
        MockHttpServletRequest req4 = new MockHttpServletRequest("POST", "/api/v1/auth/register");
        req4.addHeader("CF-Connecting-IP", "203.0.113.195");
        req4.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse res4 = new MockHttpServletResponse();

        filter.doFilterInternal(req4, res4, chain);
        assertThat(res4.getStatus()).isEqualTo(429);

        // Different CF IP should succeed
        MockHttpServletRequest reqOther = new MockHttpServletRequest("POST", "/api/v1/auth/register");
        reqOther.addHeader("CF-Connecting-IP", "198.51.100.10");
        MockHttpServletResponse resOther = new MockHttpServletResponse();

        filter.doFilterInternal(reqOther, resOther, chain);
        assertThat(resOther.getStatus()).isEqualTo(200);
    }

    @Test
    void whenDisabled_allRequestsPassThrough() throws ServletException, IOException {
        RateLimitingFilter disabledFilter = new RateLimitingFilter(false);

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr("192.168.1.50");
            MockHttpServletResponse res = new MockHttpServletResponse();

            disabledFilter.doFilterInternal(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }
    }
}
