# Personal OpenList Deployment

This file documents the personal deployment for `emptyinkpot/OpenList`. It is not upstream OpenList official deployment metadata.

## Public Entry

- Public OpenList route: `https://blog.tengokukk.com/openlist/`
- Public content root used by MyBlog: `/openlist/Obsidian`
- Public content docs root: `/openlist/Obsidian/docs`

## Runtime

- Server host: `ubuntu@124.220.233.126`
- Local OpenList service URL on the server: `http://127.0.0.1:5244`
- API prefix exposed through MyBlog/Nginx: `/openlist`
- OpenList data root recorded by MyBlog: `/srv/openlist/data`
- Docker compose default ports in this repo: `5244` and `5245`

## Integration Owner

The canonical integration and public route truth is maintained in the MyBlog repository:

- Repository: `https://github.com/emptyinkpot/emptyinkpot.github.io`
- Public site: `https://blog.tengokukk.com/`
- OpenList embed route: `https://blog.tengokukk.com/openlist/`
- MyBlog production source root: `ubuntu@124.220.233.126:/srv/myblog/repo`
- MyBlog production static root: `/srv/myblog/site`
- MyBlog Nginx config: `/etc/nginx/sites-available/myblog.conf`

Relevant MyBlog files:

- `project.json`
- `docs/operations/current-runtime-map.md`
- `ARCHITECTURE.md`
- `AI_CONTEXT.md`

## Notes

- This repository owns the OpenList application source fork.
- MyBlog owns the public web route and Nginx integration for this personal deployment.
- Do not treat this file as an executable deploy script or secret store.
