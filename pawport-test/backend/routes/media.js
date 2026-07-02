const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const express = require('express');
const axios = require('axios');
const sharp = require('sharp');

const router = express.Router();

const backendRoot = path.resolve(__dirname, '..');
const uploadsRoot = path.join(backendRoot, 'uploads');
const cacheRoot = path.join(backendRoot, 'data', 'thumb-cache');
const allowedImageHosts = new Set(['images.furrycons.cn']);

fs.mkdirSync(cacheRoot, { recursive: true });

function clampSize(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(512, Math.max(24, Math.round(number)));
}

function cachePath(source, width, height) {
  const hash = crypto
    .createHash('sha256')
    .update(`${source}|${width}x${height}|webp-v1`)
    .digest('hex')
    .slice(0, 40);
  return path.join(cacheRoot, `${hash}.webp`);
}

function localUploadPath(source) {
  if (!source.startsWith('/uploads/')) return null;

  const filePath = path.resolve(backendRoot, `.${source}`);
  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

function remoteImageUrl(source) {
  let parsed;
  try {
    parsed = new URL(source);
  } catch (error) {
    return null;
  }

  if (parsed.protocol !== 'https:' || !allowedImageHosts.has(parsed.hostname)) {
    return null;
  }

  return parsed.toString();
}

async function loadSource(source) {
  const localPath = localUploadPath(source);
  if (localPath) {
    return fsp.readFile(localPath);
  }

  const remoteUrl = remoteImageUrl(source);
  if (!remoteUrl) {
    const error = new Error('Image source is not allowed');
    error.status = 400;
    throw error;
  }

  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxContentLength: 10 * 1024 * 1024,
  });
  return Buffer.from(response.data);
}

function sendCached(res, filePath) {
  res.set({
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=604800, immutable',
  });
  return res.sendFile(filePath);
}

router.get('/thumbnail', async (req, res) => {
  const source = String(req.query.url || '');
  if (!source) {
    return res.status(400).json({ error: 'url is required' });
  }

  const width = clampSize(req.query.w, 96);
  const height = clampSize(req.query.h, 72);
  const targetPath = cachePath(source, width, height);

  try {
    await fsp.access(targetPath, fs.constants.R_OK);
    return sendCached(res, targetPath);
  } catch (error) {
    // Cache miss; continue.
  }

  try {
    const sourceBuffer = await loadSource(source);
    const thumbnail = await sharp(sourceBuffer, { animated: false, failOn: 'none' })
      .rotate()
      .resize({ width, height, fit: 'cover', position: 'centre' })
      .webp({ quality: 72 })
      .toBuffer();

    await fsp.writeFile(targetPath, thumbnail);
    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=604800, immutable',
    });
    return res.send(thumbnail);
  } catch (error) {
    console.warn('Thumbnail generation failed:', error.message);
    return res.status(error.status || 502).json({ error: 'Failed to generate thumbnail' });
  }
});

module.exports = router;
