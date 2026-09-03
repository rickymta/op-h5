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
COPY docker/web-entrypoint.sh /usr/local/bin/web-entrypoint
RUN chmod +x /usr/local/bin/web-entrypoint \
 && rm -rf /www/wwwroot/game/res /www/wwwroot/game/sound /www/wwwroot/game/spine /www/wwwroot/game/home.zip
ENTRYPOINT ["web-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
