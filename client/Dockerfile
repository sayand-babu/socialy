# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# 1. Build Stage: Compile React + Vite + Tailwind CSS
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time environment variables for Clerk & Backend API URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_BASE_URL
ARG VITE_CURRENCY

ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_CURRENCY=$VITE_CURRENCY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# 2. Production Server Stage: High-Performance Nginx Alpine
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
