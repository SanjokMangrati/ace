FROM mcr.microsoft.com/devcontainers/python:3.14

RUN apt-get update && apt-get install -y \
    curl \
    sudo \
    git \
    unzip \
    jq \
    ripgrep \
    python3-pip \
    python3-venv \
    chromium \
    fonts-noto \
    fonts-noto-color-emoji \
    libx11-6 \
    libxrandr2 \
    libxext6 \
    libxrender1 \
    libxfixes3 \
    libxss1 \
    libxtst6 \
    libxi6 \
    libxcb1 \
    libxcb-shm0 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    ffmpeg \
    xvfb \
    x11vnc \
    novnc \
    xfce4 \
    xfce4-terminal \
    dbus-x11 \
    at-spi2-core \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN echo 'export CHROMIUM_FLAGS="$CHROMIUM_FLAGS --no-sandbox --test-type --disable-dev-shm-usage --no-first-run --no-default-browser-check --lang=en-US"' > /etc/chromium.d/ace

RUN pip install --no-cache-dir trafilatura requests beautifulsoup4

COPY ace-web /usr/local/bin/ace-web
RUN chmod +x /usr/local/bin/ace-web

RUN useradd -m -s /bin/bash daytona && echo "daytona ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/91-daytona

RUN bash -c "source /usr/local/share/nvm/nvm.sh && nvm install 24 && nvm alias default 24" \
    && chown -R daytona:daytona /usr/local/share/nvm

RUN mkdir -p /usr/local/lib && chown daytona:daytona /usr/local/lib

ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    DISPLAY=:0 \
    VNC_RESOLUTION=1280x800 \
    GTK_MODULES=gail:atk-bridge \
    QT_ACCESSIBILITY=1 \
    NO_AT_BRIDGE=0

USER daytona
WORKDIR /home/daytona

RUN touch ~/.bashrc

ENTRYPOINT ["sleep", "infinity"]
