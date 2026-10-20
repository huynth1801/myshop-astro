package com.shop.sepay;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class SepayWebhookControllerTest {

    private static final SepayWebhookRequest EVENT =
            new SepayWebhookRequest("THANH TOAN MS-261020-AB3XK9", 330_000L, "in");

    private SepayPaymentService service;

    @BeforeEach
    void setUp() {
        service = mock(SepayPaymentService.class);
    }

    @Test
    void acceptsExactTokenAndDelegatesToService() {
        SepayWebhookController controller = new SepayWebhookController(service, "sepay-secret");
        when(service.reconcile(EVENT)).thenReturn(SepayMatchResult.confirmed("MS-261020-AB3XK9"));

        ResponseEntity<Object> response = controller.handle("sepay-secret", EVENT);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(SepayMatchResult.confirmed("MS-261020-AB3XK9"));
    }

    @Test
    void acceptsTokenWithBearerPrefix() {
        SepayWebhookController controller = new SepayWebhookController(service, "sepay-secret");
        when(service.reconcile(EVENT)).thenReturn(SepayMatchResult.ignored("no code"));

        ResponseEntity<Object> response = controller.handle("Bearer sepay-secret", EVENT);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void rejectsWrongToken() {
        SepayWebhookController controller = new SepayWebhookController(service, "sepay-secret");

        ResponseEntity<Object> response = controller.handle("wrong-token", EVENT);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(service, never()).reconcile(any());
    }

    @Test
    void rejectsMissingAuthorizationHeader() {
        SepayWebhookController controller = new SepayWebhookController(service, "sepay-secret");

        ResponseEntity<Object> response = controller.handle(null, EVENT);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(service, never()).reconcile(any());
    }

    @Test
    void rejectsEverythingWhenTokenUnconfigured() {
        SepayWebhookController controller = new SepayWebhookController(service, "");

        ResponseEntity<Object> response = controller.handle("anything", EVENT);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        verify(service, never()).reconcile(any());
    }
}
