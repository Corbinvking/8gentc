# Agent Host — Deployment Requirements

## Overview

The agent-host service manages Docker containers for running 8gent agents. It uses `dockerode` to communicate with the Docker daemon and requires direct access to the Docker API.

**This service cannot run on serverless platforms (Vercel, AWS Lambda).** It must run on a VM or dedicated server with Docker installed.

## Requirements

### Infrastructure

- **DigitalOcean Droplet** (recommended): 4GB RAM / 2 vCPU minimum for up to 50 concurrent agent containers
- **Docker Engine** installed and running on the host
- **Docker socket access**: The process must have read/write access to `/var/run/docker.sock`
- **Agent Docker image**: `8gent-agent:latest` must be built and available locally or in a registry the host can pull from

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3003` | HTTP server port |
| `LLM_GATEWAY_URL` | Yes | `http://llm-gateway:3002` | URL of the LLM gateway service |
| `ENGINE_API_URL` | Yes | `http://engine:3001` | URL of the engine API service |

### Docker Socket Access

The agent-host process needs access to the Docker daemon. Options:

1. **Direct socket mount** (simplest for single-host deployments):
   ```bash
   # Run agent-host with Docker socket access
   docker run -v /var/run/docker.sock:/var/run/docker.sock agent-host:latest
   ```

2. **Docker group membership** (for non-containerized deployments):
   ```bash
   sudo usermod -aG docker $USER
   ```

3. **TCP socket** (for remote Docker daemon):
   Set `DOCKER_HOST` environment variable to point to the remote daemon.

### Agent Container Image

Build the agent base image before starting the service:

```bash
docker build -t 8gent-agent:latest -f Dockerfile.agent .
```

## Resource Limits

Container resource limits are determined by user plan:

| Plan | Max Agents | Memory/Agent | CPU Shares/Agent |
|------|-----------|-------------|-----------------|
| Free | 1 | 128 MB | 256 |
| Starter | 3 | 256 MB | 512 |
| Pro | 10 | 512 MB | 1024 |
| Enterprise | 50 | 1024 MB | 2048 |

## Health Monitoring

The health monitor runs on a 30-second interval and:
- Checks container health status
- Restarts containers that fail 3 consecutive health checks
- Sends containers to a dead-letter queue after 5 restart failures
- Reports container metrics via `GET /metrics`

## Production Checklist

- [ ] Docker Engine installed and daemon running
- [ ] `/var/run/docker.sock` accessible to the process
- [ ] `8gent-agent:latest` image available
- [ ] `LLM_GATEWAY_URL` and `ENGINE_API_URL` configured
- [ ] Firewall allows outbound connections from agent containers to gateway/engine
- [ ] Log rotation configured for container logs
- [ ] Disk space monitoring (agent containers produce logs and temp files)
- [ ] Network isolation: agent containers should be on an internal Docker network
