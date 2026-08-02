---
name: docker
description: >-
  Write or debug Dockerfiles, Compose files, and container runtime behavior — layer caching, multi-stage builds, healthchecks, networking. Use when containerizing a service or when a container misbehaves.
targets: [cursor]
---

# Docker

## When to use

- Writing or debugging Dockerfiles, Compose files, or container runtime behavior.
- Image size, security, or multi-stage build concerns.

## Steps

1. Choose a **minimal base** suitable for the language/runtime; pin versions with tags you can rebuild.
2. Use **multi-stage builds** to separate build tools from runtime; copy only needed artifacts.
3. Run as **non-root** when possible; set `USER` after dependencies are installed.
4. Order Dockerfile layers for **cache**: stable deps first, app code last.
5. Use **healthchecks** for long-running services; set sensible timeouts and start periods.
6. Pass **secrets** via env, secrets mounts, or orchestrator secrets—never bake into images.
7. For Compose, define **networks** and **volumes** explicitly; avoid implicit host mounts in prod.
8. Scan images for vulnerabilities; rebuild on base image updates.
