FROM nginx:alpine

LABEL maintainer="fountain-schedule"
LABEL description="城市广场喷泉开放排程系统"

COPY . /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
