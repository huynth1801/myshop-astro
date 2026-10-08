# ADR 0002 — Spring Boot 4.x (not 3.x)

Date: 2026-10-08 · Status: accepted

## Context

The original brainstorm specified "Spring Boot 3.x". When scaffolding started
(2026-10-08), start.spring.io rejects 3.x outright: "Spring Boot compatibility
range is >=4.0.0". Spring Boot 3.5's OSS support ended mid-2026, so a new
payments-handling service on 3.x would start without public security patches.

## Decision

Use **Spring Boot 4.1.x** (initializr default, currently 4.1.1) on **Java 21**.

## Consequences

- Starter names are modular in Boot 4: `spring-boot-starter-webmvc` instead of
  `spring-boot-starter-web`; test starters are per-module. The generated pom
  already reflects this.
- Everything else in the plan holds unchanged: Jakarta EE APIs, Spring Security
  lambda DSL with stateless JWT, Flyway (+ `flyway-database-postgresql`),
  `ddl-auto=validate`, Testcontainers.
- Boot 4 ships Hibernate ORM 7 — entity mappings in `apps/api` use standard
  annotations (`@JdbcTypeCode(SqlTypes.JSON)` from Hibernate for jsonb).
- Revisit OSS support dates before the launch checklist is signed off.
