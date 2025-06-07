# Testing Bot Lambda Locally

## 🔧 Configure API Server

Create/update `api-server/src/main/resources/application.properties`:

```properties
# Database configuration
spring.datasource.url=jdbc:mysql://localhost:3306/checkersonline?createDatabaseIfNotExist=true&useSSL=false
spring.datasource.username=root
spring.datasource.password=

# JPA settings
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# Server port  
server.port=8081

# Enable Lambda integration
bot.lambda.enabled=true
bot.lambda.url=http://localhost:8080
```

This guide shows how to test the complete Lambda integration on your local machine before deploying to AWS.

## Setup

### Terminal 1 - Start Bot Lambda
```bash
# From backend/ directory
.\mvnw.cmd quarkus:dev -pl bot-lambda
```
**Result:** Bot Lambda runs on `http://localhost:8080`

### Terminal 2 - Start API Server  
```bash
# From backend/ directory
.\mvnw.cmd spring-boot:run -pl api-server "-Dserver.port=8081"
```
**Result:** API Server runs on `http://localhost:8081`

## Testing

### 1. Full Integration Test
1. Point frontend to `http://localhost:8081` in [frontend/proxy.conf.json](/frontend/proxy.conf.json)
2. Start new game against bot
3. **Watch the logs** in both terminals

### 2. Test Fallback Resilience
1. While playing, stop Bot Lambda (Ctrl+C in Terminal 1)
2. Try to make a bot move
3. **Expected:** Bot still works using local fallback

## Next Steps

If local testing works perfectly:
1. Your code is ready for AWS Lambda deployment
2. The only change needed will be updating `bot.lambda.url` to your AWS Lambda URL