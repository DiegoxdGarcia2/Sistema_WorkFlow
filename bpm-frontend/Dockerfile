# Stage 1: Build the Angular application
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx ng build --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the build output from the previous stage
COPY --from=build /app/dist/bpm-frontend/browser /usr/share/nginx/html
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD sh -c "sed -i 's|PORT|'\"${PORT:-80}\"'|g; s|BACKEND_URL|'\"${BACKEND_URL:-http://backend-core:8080}\"'|g; s|AI_SERVICE_URL|'\"${AI_SERVICE_URL:-http://ai-microservice:8000}\"'|g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
