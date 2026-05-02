#!/bin/bash
set -e

DOCKER_USER="ramayya325"
TAG="v1"

# Login (secure way)
echo "Ramayya@325" | docker login -u "$DOCKER_USER" --password-stdin

# Stop & remove containers
for c in ims-frontend ims-backend ims-postgres ims-redis ims-mongo; do
  docker stop $c || true
  docker rm $c || true
done

# Build images
docker build -t $DOCKER_USER/ims-backend:$TAG ./backend
docker build -t $DOCKER_USER/ims-frontend:$TAG ./frontend

# Run containers
docker run -d --name ims-backend -p 4000:4000 $DOCKER_USER/ims-backend:$TAG
docker run -d --name ims-frontend -p 3000:3000 $DOCKER_USER/ims-frontend:$TAG

# Databases (official images)
docker run -d --name ims-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
docker run -d --name ims-redis -p 6379:6379 redis:7-alpine
docker run -d --name ims-mongo -p 27017:27017 mongo:7

# Push images
docker push $DOCKER_USER/ims-backend:$TAG
docker push $DOCKER_USER/ims-frontend:$TAG
