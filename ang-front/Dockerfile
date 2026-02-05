FROM node:23-slim
WORKDIR /app

# Install Angular CLI first
RUN npm install -g @angular/cli@19.1.8

COPY package*.json ./
RUN npm ci
COPY . .

# Expose port 4200 (Angular dev server default)
EXPOSE 4200

# Start development server with host binding
CMD ["ng", "serve", "--host=0.0.0.0", "--disable-host-check"]
