package org.onlinecheckers.backend.config;

import org.onlinecheckers.backend.websocket.GameWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private GameWebSocketHandler gameWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Register WebSocket endpoint for game connections
        registry.addHandler(gameWebSocketHandler, "/ws/game/{gameId}")
                .setAllowedOrigins("*") // Configure origins based on your security needs
                .withSockJS(); // Enable SockJS fallback for older browsers
    }
}