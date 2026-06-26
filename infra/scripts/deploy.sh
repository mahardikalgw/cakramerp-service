#!/usr/bin/env bash
# Usage: deploy.sh <service> <sha>
#   service: app | doc
#   sha:     full or short commit SHA
set -euo pipefail

SERVICE="${1:?service required (app|doc)}"
SHA="${2:?sha required}"
cd /home/deploy/cakramerp

# Map app -> service image key
case "$SERVICE" in
  app) KEY="IMAGE_SERVICE"; IMG="cakramerp-service" ;;
  doc) KEY="IMAGE_DOC";      IMG="cakramerp-document" ;;
  *) echo "unknown service: $SERVICE" >&2; exit 1 ;;
esac

TAG="ghcr.io/mahardikalgw/${IMG}:sha-${SHA:0:7}"

# Rewrite only this service's line in .env.image (idempotent)
if grep -q "^${KEY}=" .env.image; then
  sed -i "s|^${KEY}=.*|${KEY}=${TAG}|" .env.image
else
  echo "${KEY}=${TAG}" >> .env.image
fi

# GHCR auth on VM (if not already logged in — safe to repeat)
echo "$GHCR_PAT" | docker login ghcr.io -u mahardikalgw --password-stdin 2>/dev/null || true

docker compose --env-file .env.image pull "$SERVICE"
docker compose --env-file .env.image up -d --no-deps "$SERVICE"

if [ "$SERVICE" = "app" ]; then
  # run migrations inside the freshly-started app container
  docker compose exec -T app pnpm migration:run
fi

# Health checks
case "$SERVICE" in
  app) curl -sf http://localhost:3000/health/live && echo " app OK" ;;
  doc) curl -sf http://localhost:8080/health/live && echo " doc OK" ;;
esac
