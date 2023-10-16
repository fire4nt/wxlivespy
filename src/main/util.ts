/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export function md5OfFile(filename: string) {
  const hash = crypto.createHash('md5');
  const fileContent = fs.readFileSync(filename);
  hash.update(fileContent);
  const md5 = hash.digest('hex');
  return md5;
}
