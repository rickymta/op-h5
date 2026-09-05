# nginx phuc vu file tinh cua website/game (client LayaAir) + proxy PHP sang php-fpm :9001.
# Bundle client (libs/e228b-*.js) chua 4 URL co port -> dien PUBLIC_HOST luc start.
# res/ sound/ spine/ mount tu host (khong nam trong image).
#
# build tu thu muc goc repo:
#   docker build -f docker/nginx/Dockerfile -t ghcr.io/rickymta/op-h5-nginx:latest .
FROM nginx:1.25-alpine
RUN apk add --no-cache bash
COPY website/game/ /www/wwwroot/game/
COPY docker/nginx/game.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/game_site.conf /etc/nginx/game_site.conf
COPY docker/nginx/adapter_proxy.conf /etc/nginx/adapter_proxy.conf
# Danh sach cho phep vao cong cu GM. Mac dinh CHI loopback; muon mo cho mot dia chi co
# dinh thi sua gm_access.conf roi build lai, hoac mount de len file nay.
COPY docker/nginx/gm_access.conf /etc/nginx/gm_access.conf
# Cau hinh domain — KHONG dat vao conf.d/ nen mac dinh khong co tac dung. Bat bang cach
# dien __PUBLIC_DOMAIN__ roi mount de len /etc/nginx/conf.d/domains.conf. Xem
# docs/deploy-runbook.md muc "Tro domain that".
COPY docker/nginx/domains.conf /etc/nginx/domains.conf.mau
COPY docker/nginx/tls.conf /etc/nginx/tls.conf.mau
COPY docker/web-entrypoint.sh /usr/local/bin/web-entrypoint
RUN chmod +x /usr/local/bin/web-entrypoint \
 && rm -rf /www/wwwroot/game/res /www/wwwroot/game/sound /www/wwwroot/game/spine /www/wwwroot/game/home.zip
ENTRYPOINT ["web-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
