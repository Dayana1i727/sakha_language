#!/bin/bash
# ставит Playwright + системные библиотеки для проверки index.html
set -e
pip install -q playwright lameenc numpy scipy soundfile >/dev/null 2>&1 || true
mkdir -p /tmp/debs /tmp/libs && cd /tmp/debs
for p in libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 \
         libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
         libasound2t64 libatspi2.0-0t64 libglib2.0-0t64 libexpat1 libdbus-1-3 libx11-6 libxcb1 \
         libxext6 libxrender1 libxi6 libpixman-1-0 libfontconfig1 libfreetype6 libpng16-16t64 \
         libharfbuzz0b libfribidi0 libthai0 libdatrie1 libgraphite2-3 libbrotli1 libbz2-1.0 \
         liblzma5 libzstd1 libselinux1 libpcre2-8-0 libffi8 libmount1 libblkid1 libuuid1 \
         libsystemd0 libcap2 libgcrypt20 libgpg-error0 liblzo2-2; do
  apt-get download "$p" >/dev/null 2>&1 || true
done
for f in *.deb; do dpkg-deb -x "$f" /tmp/libs 2>/dev/null || true; done
python3 -m playwright install chromium >/dev/null 2>&1 || true
echo "готово"
