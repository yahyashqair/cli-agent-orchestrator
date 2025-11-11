# Repository Guidelines

## Project Structure
- Backend lives under `/java` using Java 21 + Spring Boot 3 WebFlux with Apache Pekko typed actors.
- UI lives under `/javaUI` using React 18, TypeScript, Vite, and TailwindCSS.
- Integration tests reside in `/java/src/test` and use JUnit 5 with Testcontainers.
- CLI entry points are provided in `/java/src/main/java/com/yahyashqair/jao/cli` via Picocli.

## Development Commands
- `mvn -f java/pom.xml clean verify` – compile and run Testcontainers-backed integration tests.
- `mvn -f java/pom.xml spring-boot:run` – start the reactive backend locally.
- `npm --prefix javaUI install` then `npm --prefix javaUI run dev` – start the dashboard with API proxying.
- `npm --prefix javaUI run build` – verify UI builds and type checks pass.

## Coding Standards
- Follow Java 21 conventions with records for immutable data, use Pekko typed actors for concurrency, and prefer Reactor types (`Mono`, `Flux`) in the service and API layers.
- Persist terminal state and logs through Spring Data R2DBC repositories—avoid shared mutable state across actors.
- For the UI, keep React components functional with hooks, type everything in TypeScript, and keep Tailwind utility classes readable.
- CLI commands should remain backward compatible with the legacy verbs and exit codes.

## Testing Expectations
- Every change to actor behavior, routing, or persistence should extend the Testcontainers integration coverage.
- UI changes that affect data flow should include updates to WebSocket handling or mock stories when applicable.

## Documentation
- Update the root `README.md` when adding commands, endpoints, or event payloads.
- Maintain Mermaid diagrams that illustrate actor communication and session lifecycles when the topology evolves.
