FROM mcr.microsoft.com/playwright:latest

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build || true

# Default command
CMD ["npx", "playwright", "test"]
