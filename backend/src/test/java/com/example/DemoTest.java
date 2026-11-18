package com.example;

import io.micronaut.context.annotation.Property;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.runtime.EmbeddedApplication;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;

@MicronautTest
@Property(name = "micronaut.server.port", value = "-1")
class DemoTest {

    @Inject
    EmbeddedApplication<?> application;

    @Inject
    @Client("/")
    HttpClient client;

    @Inject
    com.aluguel.services.EmailService emailService;

    @Test
    void testItWorks() {
        Assertions.assertTrue(application.isRunning());
    }

    @Test
    void testCorsVercelProduction() {
        HttpRequest<?> req = HttpRequest.GET("/api/automoveis")
                .header("Origin", "https://apex-experience.vercel.app");

        HttpResponse<?> resp = client.toBlocking().exchange(req);
        Assertions.assertEquals("https://apex-experience.vercel.app", resp.getHeaders().get("Access-Control-Allow-Origin"));
    }

    @Test
    void testCorsLocalhost() {
        HttpRequest<?> req = HttpRequest.GET("/api/automoveis")
                .header("Origin", "http://localhost:5173");

        HttpResponse<?> resp = client.toBlocking().exchange(req);
        Assertions.assertEquals("http://localhost:5173", resp.getHeaders().get("Access-Control-Allow-Origin"));
    }

    @Test
    void testCorsPreflight() {
        HttpRequest<?> req = HttpRequest.OPTIONS("/api/automoveis")
                .header("Origin", "https://apex-experience.vercel.app")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "authorization,content-type");

        HttpResponse<?> resp = client.toBlocking().exchange(req);
        Assertions.assertEquals("https://apex-experience.vercel.app", resp.getHeaders().get("Access-Control-Allow-Origin"));
    }

    @Test
    void testContaTesteInicializada() {
        HttpRequest<?> loginReq = HttpRequest.POST("/login",
                java.util.Map.of("username", "teste@gmail.com", "password", "122456"));

        HttpResponse<java.util.Map> resp = client.toBlocking().exchange(loginReq, java.util.Map.class);
        Assertions.assertEquals(200, resp.getStatus().getCode());
        Assertions.assertNotNull(resp.body().get("access_token"));
    }

    @Test
    void testResendUrlComSchemeValido() {
        Assertions.assertEquals("https://api.resend.com/emails", emailService.getResendApiUrl());
    }
}
