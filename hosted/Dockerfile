FROM eclipse-temurin:17-jdk-jammy
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --gid 10001 candidate && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin candidate && mkdir -p /opt/prepspace /work && chmod 700 /opt/prepspace && chown 10001:10001 /work
COPY runner.py /opt/prepspace/runner.py
RUN chmod 700 /opt/prepspace/runner.py
