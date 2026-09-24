FROM ghcr.io/selkies-project/selkies/desktop:2.0.0rc1-ubuntu26.04

ARG BUILD_VERSION
ARG BUILD_ARCH

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}"

USER root

COPY rootfs /

RUN test -x /etc/container-entrypoint.sh && \
    test -x /usr/bin/sudo-root && \
    chmod 0755 /usr/local/bin/ha-meeting-recorder-entrypoint

ENTRYPOINT ["/usr/local/bin/ha-meeting-recorder-entrypoint"]
