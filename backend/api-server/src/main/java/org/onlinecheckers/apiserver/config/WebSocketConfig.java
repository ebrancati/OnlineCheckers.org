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
import org.springframework.beans.factory.annotation.Value;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private GameWebSocketHandler gameWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Native WebSocket (recommended for better performance)
        registry.addHandler(gameWebSocketHandler, "/ws/game")
                .setAllowedOriginPatterns("*")
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request, 
                                                 ServerHttpResponse response,
                                                 WebSocketHandler wsHandler, 
                                                 Map<String, Object> attributes) throws Exception {
                        
                        System.out.println("=== AWS WEBSOCKET HANDSHAKE DEBUG ===");
                        System.out.println("Request URI: " + request.getURI());
                        System.out.println("Headers: " + request.getHeaders());
                        
                        if (request instanceof ServletServerHttpRequest) {
                            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
                            HttpSession httpSession = servletRequest.getServletRequest().getSession(false);
                            
                            if (httpSession != null) {
                                String sessionId = httpSession.getId();
                                System.out.println("Found HTTP session: " + sessionId);
                                attributes.put("HTTP_SESSION_ID", sessionId);
                                attributes.put("HTTP_SESSION", httpSession);
                            } else {
                                System.out.println("No HTTP session found, creating new session");
                                httpSession = servletRequest.getServletRequest().getSession(true);
                                attributes.put("HTTP_SESSION_ID", httpSession.getId());
                                attributes.put("HTTP_SESSION", httpSession);
                            }
                        }
                        
                        System.out.println("WebSocket attributes: " + attributes);
                        System.out.println("=====================================");
                        
                        return true;
                    }
                    
                    @Override
                    public void afterHandshake(
                        ServerHttpRequest request, 
                        ServerHttpResponse response,
                        WebSocketHandler wsHandler, 
                        Exception exception
                    ) {
                        if (exception != null) {
                            System.err.println("WebSocket handshake failed: " + exception.getMessage());
                        } else {
                            System.out.println("WebSocket handshake completed successfully");
                        }
                    }
                });
    }
}