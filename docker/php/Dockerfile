# php-fpm phuc vu website/game (cong nap, GM tool, API). Ma PHP nuong vao image voi
# placeholder; secrets + PUBLIC_HOST dien luc start (web-entrypoint.sh).
# res/ sound/ spine/ KHONG co trong image (1.6 GB, khong nam trong git) -> mount tu host.
#
# build tu thu muc goc repo:
#   docker build -f docker/php/Dockerfile -t ghcr.io/rickymta/op-h5-php:latest .
FROM php:7.4-fpm-alpine
# bash: web-entrypoint.sh dung #!/bin/bash; image alpine khong co san bash.
RUN apk add --no-cache bash \
 && docker-php-ext-install -j2 pdo_mysql mysqli \
 && rm -rf /tmp/* /var/cache/apk/* \
 && mkdir -p /var/lib/php/sessions && chown www-data:www-data /var/lib/php/sessions
COPY website/game/ /www/wwwroot/game/
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/zz-tcg.conf
COPY docker/web-entrypoint.sh /usr/local/bin/web-entrypoint
RUN chmod +x /usr/local/bin/web-entrypoint \
 && rm -rf /www/wwwroot/game/res /www/wwwroot/game/sound /www/wwwroot/game/spine /www/wwwroot/game/home.zip \
 && mkdir -p /www/wwwroot/game/api/temp /www/wwwroot/game/gm/user/log /www/wwwroot/game/gm/log \
 && chown -R www-data:www-data /www/wwwroot/game/api/temp /www/wwwroot/game/gm/user/log /www/wwwroot/game/gm/log
WORKDIR /www/wwwroot/game
ENTRYPOINT ["web-entrypoint"]
CMD ["php-fpm"]
