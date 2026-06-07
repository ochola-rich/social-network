# Use Node.js 20 alpine as base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment variables for Next.js
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start Next.js in development mode
CMD ["npm", "run", "dev"]
