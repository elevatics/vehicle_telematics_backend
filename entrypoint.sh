#!/bin/sh
set -e

echo "⏳ Running database migrations..."
node --dns-result-order=ipv4first dist/scripts/migrate.js

echo "🚀 Starting Fleet Telematics API..."
exec node --dns-result-order=ipv4first dist/index.js
