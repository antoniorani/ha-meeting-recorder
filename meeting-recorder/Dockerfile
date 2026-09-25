FROM ghcr.io/selkies-project/selkies/desktop:2.0.0rc1-ubuntu26.04

ARG BUILD_VERSION
ARG BUILD_ARCH
ARG DEBIAN_FRONTEND=noninteractive

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}"

USER root

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
      nginx \
      pulseaudio-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /var/cache/debconf/* /tmp/* /var/tmp/*

COPY rootfs /

RUN test -x /etc/container-entrypoint.sh && \
    test -x /usr/bin/sudo-root && \
    command -v ffmpeg >/dev/null 2>&1 && \
    command -v ffprobe >/dev/null 2>&1 && \
    command -v pactl >/dev/null 2>&1 && \
    command -v nginx >/dev/null 2>&1 && \
    chmod 0755 \
      /usr/local/bin/ha-meeting-recorder-entrypoint \
      /usr/local/bin/meeting-recorder-api

ENTRYPOINT ["/usr/local/bin/ha-meeting-recorder-entrypoint"]
