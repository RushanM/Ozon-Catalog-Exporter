// ==UserScript==
// @name            Ozon Catalog Exporter
// @name:ru         Экспортировщик каталога Ozon
// @author          Deflecat
// @contributionURL https://boosty.to/rushanm
// @description     Exports Ozon preloaded catalog items to JSON and Markdown files
// @description:ru  Экспортирует товары из прогруженной части каталога Ozon в файлы JSON и Markdown
// @downloadURL     https://github.com/RushanM/Ozon-Catalog-Exporter/raw/master/ozon-catalog-exporter.user.js
// @grant           none
// @homepageURL     https://github.com/RushanM/Ozon-Catalog-Exporter
// @license         MIT
// @match           https://*.ozon.ru/*
// @match           https://ozon.ru/*
// @run-at          document-end
// @namespace       ozon-catalog-exporter
// @supportURL      https://github.com/RushanM/Ozon-Catalog-Exporter/issues
// @updateURL       https://github.com/RushanM/Ozon-Catalog-Exporter/raw/master/ozon-catalog-exporter.user.js
// @version         A1
// ==/UserScript==

(() => {
  'use strict';

  const BTN_ID = 'ozon-export-btn';
  const BTN_STYLE = `
    #${BTN_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 99999;
      background: #005bff;
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 10px 16px;
      font: 14px/1.2 "Segoe UI", sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
      cursor: pointer;
      opacity: 0.92;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    #${BTN_ID}:hover { opacity: 1; transform: translateY(-2px); }
  `;

  const waitForTiles = (timeoutMs = 8000) =>
    new Promise(resolve => {
      const started = Date.now();
      const timer = setInterval(() => {
        const tiles = document.querySelectorAll('.tile-root');
        if (tiles.length > 0 || Date.now() - started > timeoutMs) {
          clearInterval(timer);
          resolve(tiles);
        }
      }, 200);
    });

  const toNumber = str => {
    if (!str) return null;
    const digits = str.replace(/[^\d]/g, '');
    return digits ? Number(digits) : null;
  };

  const toFloat = str => {
    if (!str) return null;
    const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return Number.isFinite(val) ? val : null;
  };

  const collectItems = () => {
    const tiles = Array.from(document.querySelectorAll('.tile-root'));
    return tiles.map(tile => {
      const titleSpan = tile.querySelector('span.tsBody500Medium');
      const title = titleSpan?.textContent.trim() || '';

      const linkEl =
        titleSpan?.closest('a.tile-clickable-element') ||
        tile.querySelector('a.tile-clickable-element');
      const url = linkEl ? new URL(linkEl.getAttribute('href'), location.origin).href : '';

      const priceEl = tile.querySelector('span.tsHeadline500Medium');
      const priceRaw = priceEl?.textContent.trim() || '';
      const price = toNumber(priceRaw);

      const ratingEl = tile.querySelector('div.tsBodyMBold span[style*="textPremium"]');
      const rating = toFloat(ratingEl?.textContent || '');

      const reviewsEl = tile.querySelector('div.tsBodyMBold span[style*="textSecondary"]');
      const reviews = toNumber(reviewsEl?.textContent || '');

      return { title, price, priceRaw, rating, reviews, url };
    }).filter(item => item.title && item.url);
  };

  const saveFile = (filename, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  };

  const toMarkdown = items => {
    const header = ['Название', 'Цена', 'Рейтинг', 'Отзывы', 'Ссылка'];
    const escape = text => String(text).replace(/\|/g, '\\|');
    const rows = items.map(({ title, price, rating, reviews, url }) => [
      escape(title),
      price ?? '',
      rating ?? '',
      reviews ?? '',
      `[Открыть](${url})`
    ]);
    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${header.map(() => '---').join(' | ')} |`,
      ...rows.map(r => `| ${r.join(' | ')} |`)
    ];
    return lines.join('\n');
  };

  const runExport = () => {
    const items = collectItems();
    if (!items.length) {
      alert('Карточки не найдены. Прокрутите каталог или подождите загрузки.');
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveFile(`ozon-catalog-${stamp}.json`, 'application/json', JSON.stringify(items, null, 2));
    saveFile(`ozon-catalog-${stamp}.md`, 'text/markdown', toMarkdown(items));
    alert(`Собрано ${items.length} товаров. Файлы скачаны.`);
  };

  const injectButton = () => {
    if (document.getElementById(BTN_ID)) return;
    const style = document.createElement('style');
    style.textContent = BTN_STYLE;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = 'Экспортировать';
    btn.addEventListener('click', runExport);
    document.body.appendChild(btn);
  };

  const init = async () => {
    await waitForTiles();
    injectButton();
  };

  init();
})();