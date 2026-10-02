# Update the NODE_VERSION arg in docker-compose.yml to pick a Node version: 18, 16, 14
ARG NODE_VERSION=24
FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VERSION}

# mise resolves the real toolchain from the repo's .mise.toml, so the container
# and CI install identical node and pnpm versions. The `mise install` step needs
# the checked-out repo, so it runs from postCreateCommand in devcontainer.json.
ARG MISE_VERSION=2026.9.12
USER node
ENV MISE_INSTALL_PATH=/home/node/.local/bin/mise
# ENV, not .bashrc: postCreateCommand runs through a non-interactive shell that
# never sources a login file, so the tools have to be on PATH for every shell.
ENV PATH="/home/node/.local/bin:/home/node/.local/share/mise/shims:${PATH}"
RUN curl -fsSL https://mise.run | MISE_VERSION=${MISE_VERSION} sh
USER root

# Astro dev server port
EXPOSE 4321

# [Optional] Uncomment this section to install additional OS packages you may want.
#
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install more global node packages
# RUN sudo -u node npm install -g <your-package-list-here>