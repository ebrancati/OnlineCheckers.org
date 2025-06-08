package org.onlinecheckers.apiserver.config;

import org.onlinecheckers.apiserver.controllers.GameWebSocketHandler;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.beans.factory.annotation.Autowired;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private GameWebSocketHandler gameWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameWebSocketHandler, "/ws/game")
                .setAllowedOrigins("*")
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request, 
                                                 ServerHttpResponse response,
                                                 WebSocketHandler wsHandler, 
                                                 Map<String, Object> attributes) throws Exception {
                        
                        System.out.println("=== WEBSOCKET HANDSHAKE DEBUG ===");
                        
                        if (request instanceof ServletServerHttpRequest) {
                            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
                            HttpSession httpSession = servletRequest.getServletRequest().getSession(false);
                            
                            if (httpSession != null) {
                                String sessionId = httpSession.getId();
                                System.out.println("Found HTTP session: " + sessionId);
                                attributes.put("HTTP_SESSION_ID", sessionId);
                                attributes.put("HTTP_SESSION", httpSession);
                            } else {
                                System.out.println("No HTTP session found");
                            }
                        }
                        
                        System.out.println("WebSocket attributes: " + attributes);
                        System.out.println("=================================");
                        
                        return true;
                    }
                    
                    @Override
                    public void afterHandshake(
                        ServerHttpRequest request, 
                        ServerHttpResponse response,
                        WebSocketHandler wsHandler, 
                        Exception exception
                    ) {}
                });
    }
}