# Deployment Checklist

Use this checklist to verify your Messaging Intelligence Platform deployment.

---

## Pre-Deployment

- [ ] Azure VM created with correct specifications
  - [ ] Ubuntu 22.04 LTS
  - [ ] B1s or larger
  - [ ] Static public IP
  - [ ] NSG rules configured (22, 80, 443, 8448)

- [ ] DuckDNS configured
  - [ ] Subdomain created
  - [ ] Pointing to VM IP
  - [ ] Auto-update script (optional)

- [ ] Supabase ready
  - [ ] PostgreSQL database accessible
  - [ ] Connection string tested

---

## Infrastructure

- [ ] Docker installed and running
  ```bash
  docker --version
  docker-compose --version
  ```

- [ ] All containers starting
  ```bash
  docker-compose ps
  ```
  Expected: All services "Up"

- [ ] Container logs clean
  ```bash
  docker-compose logs --tail=50
  ```
  No critical errors

---

## Matrix Synapse

- [ ] Synapse responding
  ```bash
  curl http://localhost:8008/_matrix/client/versions
  ```

- [ ] Admin user created
  ```bash
  # Should be able to login
  ```

- [ ] Federation working (if enabled)
  ```bash
  curl http://localhost:8008/_matrix/federation/v1/version
  ```

- [ ] Well-known files accessible
  ```bash
  curl https://your-domain/.well-known/matrix/server
  curl https://your-domain/.well-known/matrix/client
  ```

---

## Instagram Bridge

- [ ] Bridge container running
  ```bash
  docker-compose ps mautrix-instagram
  ```

- [ ] Bridge bot responsive
  - Start chat with @instagrambot
  - Send `help`

- [ ] Instagram login successful
  - [ ] Authenticated with Instagram
  - [ ] Contacts syncing

- [ ] Messages bridging
  - [ ] Send DM on Instagram
  - [ ] Appears in Matrix room

---

## AI Backend

- [ ] API responding
  ```bash
  curl http://localhost:8000/health
  ```

- [ ] All services initialized
  - [ ] summarizer: true
  - [ ] intent_parser: true
  - [ ] vector_store: true

- [ ] Summarization working
  ```bash
  curl -X POST http://localhost:8000/api/summarize \
    -H "Content-Type: application/json" \
    -d '{"messages": ["Hello", "How can I help?", "I need support"]}'
  ```

- [ ] Intent classification working
  ```bash
  curl -X POST http://localhost:8000/api/intent \
    -H "Content-Type: application/json" \
    -d '{"message": "URGENT: Need help immediately!"}'
  ```

- [ ] Priority scoring working
  ```bash
  curl -X POST http://localhost:8000/api/priority \
    -H "Content-Type: application/json" \
    -d '{"messages": ["This is urgent!", "Just saying hi"]}'
  ```

---

## Frontend

- [ ] Frontend accessible
  ```bash
  curl http://localhost:3000
  ```

- [ ] Login page loads
  - [ ] Homeserver field populated
  - [ ] Can enter credentials

- [ ] Dashboard loads after login
  - [ ] Stats cards visible
  - [ ] Rooms list populated

- [ ] All pages accessible
  - [ ] /dashboard
  - [ ] /rooms/[id]
  - [ ] /priority
  - [ ] /insights
  - [ ] /knowledge

---

## NGINX

- [ ] HTTP redirect to HTTPS works
  ```bash
  curl -I http://your-domain/
  # Should return 301 redirect
  ```

- [ ] HTTPS working
  ```bash
  curl -I https://your-domain/
  ```

- [ ] Matrix routes working
  ```bash
  curl https://your-domain/_matrix/client/versions
  ```

- [ ] API routes working
  ```bash
  curl https://your-domain/api/health
  ```

---

## End-to-End Tests

- [ ] **Full message flow**
  1. Send Instagram DM
  2. Message appears in Matrix
  3. Message visible in frontend
  4. AI analysis generates

- [ ] **AI features**
  - [ ] Summarization generates readable summary
  - [ ] Intent classification correct
  - [ ] Priority scoring ranks messages
  - [ ] Knowledge base extracts Q&A

- [ ] **User experience**
  - [ ] Login works
  - [ ] Navigation smooth
  - [ ] No console errors

---

## Security

- [ ] No exposed credentials
  - [ ] .env file has proper permissions
  - [ ] No secrets in code

- [ ] Registration disabled (production)
  - [ ] Or protected with shared secret

- [ ] HTTPS enforced
  - [ ] Valid SSL certificate
  - [ ] No mixed content warnings

---

## Performance

- [ ] Response times acceptable
  - [ ] Page loads < 3s
  - [ ] API calls < 1s (non-AI)
  - [ ] AI calls < 10s

- [ ] Memory usage stable
  ```bash
  docker stats
  ```

---

## Documentation

- [ ] README up to date
- [ ] Architecture documented
- [ ] Setup guide complete
- [ ] API documentation available

---

## Sign-Off

| Check | Completed By | Date |
|-------|--------------|------|
| Infrastructure | | |
| Matrix Synapse | | |
| Instagram Bridge | | |
| AI Backend | | |
| Frontend | | |
| Security | | |
| Documentation | | |

**Deployment Status**: ☐ Ready / ☐ Issues Found

**Notes**:
