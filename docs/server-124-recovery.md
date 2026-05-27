# Server 124 Recovery Boundary

This root document no longer contains executable recovery commands.

Server recovery belongs to the modules that own the running services:

| Service | Owner |
|---------|-------|
| Gateway | DataBase |
| Content generation runtime | ContentBase |
| Web search provider | web-evidence-provider |
| RAGFlow / vector evidence | DataBase Gateway integration or the RAGFlow service owner |

ContentMRS root may document the boundary, but it must not install systemd
units, synchronize secrets, restart services, or verify production.

Dify orchestration should call the public module APIs after the owning modules
are healthy.
