# Multi-stage build for packet_service
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    libpcap-dev \
    librdkafka-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source code
COPY CMakeLists.txt .
COPY *.cpp *.h ./

# Build the application
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Final stage
FROM ubuntu:22.04

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpcap-dev \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 packetuser

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/build/packet_capture_service /app/packet_capture_service

# Change ownership
RUN chown -R packetuser:packetuser /app

# Switch to non-root user
USER packetuser

# Environment variables
ENV INTERFACE=eth0
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092
ENV KAFKA_TOPIC=raw_packets

# Entry point
ENTRYPOINT ["./packet_capture_service"]
