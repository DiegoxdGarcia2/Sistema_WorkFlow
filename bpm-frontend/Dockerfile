# Stage 1: Serve with Nginx
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
COPY dist_ready /usr/share/nginx/html

# Copy a custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
