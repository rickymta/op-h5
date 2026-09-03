FROM php:7.4-fpm-alpine
# website/game dung PDO mysql + mysqli + curl (curl da co san trong image).
RUN docker-php-ext-install -j2 pdo_mysql mysqli \
 && rm -rf /tmp/* /var/cache/apk/*
# session tren dia (config.php goi session_start)
RUN mkdir -p /var/lib/php/sessions && chown www-data:www-data /var/lib/php/sessions
WORKDIR /www/wwwroot/game
