#!/bin/sh
cd "$(dirname "$0")" || exit 1
exec python3 server/local_server.py --port 8796
