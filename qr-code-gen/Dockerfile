FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Accept build argument and set as environment variable
ARG VITE_DATA_BASE64
ENV VITE_DATA_BASE64=$VITE_DATA_BASE64

# Build the application
RUN bun run build

FROM nginx:alpine AS production

# Copy built assets from build stage
COPY --from=base /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Start nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
