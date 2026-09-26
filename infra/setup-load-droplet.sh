#!/usr/bin/env bash
# Run as root on the load-generator droplet (Ubuntu).
set -euo pipefail
gpg -k >/dev/null 2>&1 || true
curl -fsSL https://dl.k6.io/key.gpg | gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" > /etc/apt/sources.list.d/k6.list
apt-get update && apt-get install -y k6 htop git
# Raise limits so the load generator isn't the bottleneck
cat >> /etc/security/limits.conf <<'LIM'
* soft nofile 65535
* hard nofile 65535
LIM
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
k6 version
