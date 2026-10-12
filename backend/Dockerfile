# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- run: minimal JRE image, non-root user, no shell tools needed ----
FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S ibuvio && adduser -S -G ibuvio -H -s /sbin/nologin ibuvio
WORKDIR /app
COPY --from=build --chown=ibuvio:ibuvio /src/target/ibuvio-pay-backend-*.jar app.jar
USER ibuvio
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/urandom"
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/actuator/health/liveness || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
