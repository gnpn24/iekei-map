(() => {
  'use strict';

  const MODE_KEY = 'iekei-map-ui';
  const IS_JIRO_MODE = window.JIRO_INTEGRATED_MODE === true;
  const UNIFIED_MODE = window.ANDROID_UNIFIED_MODE || (IS_JIRO_MODE ? 'jiro' : 'iekei');
  const IS_JIRO_ONLY_MODE = UNIFIED_MODE === 'jiro';
  const IS_MIXED_MODE = UNIFIED_MODE === 'mixed';
  const JIRO_CATEGORY_COLORS = {
    '二郎': '#d9a800',
    '富士丸系': '#e0433e',
    '二郎出身': '#f07c1f',
    'インスパイア': '#2b7de0',
    '資本系': '#2f9e44',
    '不明': '#909090'
  };
  const JIRO_CATEGORY_OPTIONS = Object.keys(JIRO_CATEGORY_COLORS).map(value => ({ value, label: value }));
  const SORT_KEY = IS_JIRO_ONLY_MODE
    ? 'jiro-map-a-sort-v2'
    : IS_MIXED_MODE ? 'mixed-map-a-sort-v2' : 'iekei-map-a-sort';
  const JIRO_DEFAULT_CATEGORIES_KEY = 'jiro-map-a-default-categories';
  const CARD_MAP_BEHAVIOR_KEY = 'iekei-map-a-card-map-behavior';
  const SHOP_SEARCH_HISTORY_KEY = 'iekei-map-a-shop-search-history';
  const MAP_VISITED_COLOR = '#c62828';
  const MAX_SHOP_SEARCH_HISTORY = 5;
  const MAP_LABEL_CAPITAL_REGION_MIN_ZOOM = 11;
  const MAP_LABEL_TOKAI_KANSAI_MIN_ZOOM = 7;
  const MAP_LABEL_OTHER_REGION_MIN_ZOOM = 6;
  const MAP_LABEL_CHOKUSEI_MIN_ZOOM = 0;
  const MAP_LABEL_MAX_GRAPHEMES = 4;
  const MAP_LABEL_OFFSET_Y = 8;
  const MAP_SELECTED_LABEL_OFFSET_Y = 13;
  const CARD_ZOOM_OUT_MAX_STEPS = 2;
  const CARD_ZOOM_OUT_MIN_ZOOM = 9;
  const MAX_RAIL_SHOPS = 30;
  const MAP_FOCUS_Y_RATIO = 0.43;
  const PLACE_SEARCH_DELAY = 360;
  const GOOGLE_PLACES_ENDPOINT = 'https://ggmfsnyhkrdoytbpvtxd.supabase.co/functions/v1/google-places';
  const SEARCH_HISTORY_STATE = 'mapDiscoverySearch';

  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path stroke-linecap="round" d="m20 20-4-4"></path></svg>',
    location: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M14 4v6M4 17h2M10 17h10M6 14v6"></path></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-9 5 9 5 9-5-9-5Z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 16 9 5 9-5"></path></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"></path><path d="M9 3v15M15 6v15"></path></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    xmark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 3h2.9l-6.4 7.3L22 21h-5.7l-4.5-5.9L6.7 21H3.8l6.6-7.6L3.4 3h5.9l4.1 5.4L18.2 3Zm-1 16.1h1.6L8.4 4.8H6.7l10.5 14.3Z"></path></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>'
  };

  const state = {
    sort: readStoredValue(SORT_KEY, ['center', 'current', 'open', 'name'], 'center'),
    defaultCategories: readDefaultFilterCategories(),
    shopSearchSort: 'name',
    // 検索画面の系統絞り込みは、マップの初期表示設定と分ける。
    // null は全系統。配列は明示的に選択されている系統（空配列は選択なし）。
    shopSearchCategories: null,
    shopSearchNewOnly: false,
    shopSearchHistory: readShopSearchHistory(),
    cardMapBehavior: readStoredValue(CARD_MAP_BEHAVIOR_KEY, ['keep', 'zoomout'], 'zoomout'),
    adjustTab: 'filter',
    activeShopId: resumePreviousMap ? readStoredJson(MAP_VIEW_KEY)?.shopId || null : null,
    visibleShops: [],
    totalShopCount: 0,
    placeResults: [],
    searchTab: 'shops',
    photoLookupStatus: 'idle',
    photoLookupResult: null,
    placeLoading: false,
    placeError: '',
    placeSequence: 0,
    placeController: null,
    placeTimer: 0,
    googleResults: [],
    googleLoading: false,
    googleError: '',
    googleSequence: 0,
    googleController: null,
    googleTimer: 0,
    searchResultMode: {
      active: false,
      query: '',
      shopIds: [],
      totalCount: 0,
      openOnly: false,
      sort: 'name',
      previous: null
    },
    googleExpanded: false,
    mapMoveTimer: 0,
    refreshFrame: 0,
    searchResultRenderToken: 0,
    programmaticMapMove: '',
    programmaticClearTimer: 0,
    mapHooksTarget: null,
    mapGestureSource: '',
    mapGestureStartCenter: null,
    mapGestureStartZoom: null,
    zoomMoveEndPending: false,
    railGestureStartIndex: null,
    railGestureStartShopId: null,
    railGestureStartX: 0,
    railGestureStartScrollLeft: 0,
    railDragPointerId: null,
    railSettleTimer: 0,
    suppressRailUntil: 0,
    suppressCardClickUntil: 0,
    forceShopId: null,
    warnedLongLabels: new Set(),
    cardPhotos: new Map(),
    cardPhotoLoading: new Set(),
    cardPhotoHydrated: new Set(),
    detailPhotos: new Map(),
    detailPhotoLoading: new Map(),
    detailPhotoHydrated: new Set(),
    mapLabelsVisible: true,
    mapColorMode: 'lineage'
  };

  window.getDiscoverySelectedShopId = () => state.activeShopId;
  let mapShopLabels = {};
  let selectedShopIndicator = null;
  let labelSegmenter = null;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      labelSegmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    }
  } catch (_) {
    labelSegmenter = null;
  }

  const initialMode = resolveInitialMode();
  document.documentElement.dataset.mapUi = initialMode;

  try {
    ensureUiMarkup();
    bindUiEvents();
    patchClassicMapFunctions();
    syncAllControls();
  } catch (error) {
    document.documentElement.dataset.mapUi = 'classic';
    console.error('Map Discovery UIの初期化に失敗したためクラシック表示へ戻しました:', error);
  }

  function resolveInitialMode() {
    try {
      const queryValue = new URLSearchParams(window.location.search).get('mapUi');
      if (queryValue === 'a' || queryValue === 'classic') return queryValue;
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === 'a' || saved === 'classic') return saved;
    } catch (_) {}
    return 'a';
  }

  function readStoredValue(key, allowed, fallback) {
    try {
      const value = localStorage.getItem(key);
      return allowed.includes(value) ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function readShopSearchHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(SHOP_SEARCH_HISTORY_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      const seen = new Set();
      return stored.map(value => String(value || '').trim()).filter(value => {
        const normalized = normalizeSearch(value);
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      }).slice(0, MAX_SHOP_SEARCH_HISTORY);
    } catch (_) {
      return [];
    }
  }

  function persistShopSearchHistory() {
    try {
      localStorage.setItem(SHOP_SEARCH_HISTORY_KEY, JSON.stringify(state.shopSearchHistory));
    } catch (_) {}
  }

  function saveShopSearchHistory(query) {
    const value = String(query || '').trim();
    const normalized = normalizeSearch(value);
    if (!normalized) return;
    state.shopSearchHistory = [
      value,
      ...state.shopSearchHistory.filter(item => normalizeSearch(item) !== normalized)
    ].slice(0, MAX_SHOP_SEARCH_HISTORY);
    persistShopSearchHistory();
  }

  function isMapUiA() {
    return document.documentElement.dataset.mapUi === 'a';
  }

  function ensureUiMarkup() {
    const mapContainer = document.querySelector('#tab-map .map-container');
    if (!mapContainer) throw new Error('map-containerが見つかりません');

    if (!document.getElementById('map-a-root')) {
      const root = document.createElement('section');
      root.id = 'map-a-root';
      root.className = 'map-a-root';
      root.setAttribute('aria-label', '新しいマップ探索UI');
      root.innerHTML = `
        <div id="map-a-color-legend" class="map-a-color-legend" role="region" aria-label="マップの凡例">
          <div class="map-a-color-legend-row">
            <span class="map-a-color-legend-title">系統</span>
            <div id="map-a-color-legend-items" class="map-a-color-legend-items"></div>
          </div>
          <div id="map-a-visit-legend" class="map-a-visit-legend" aria-label="訪問有無の凡例" hidden>
            <span class="map-a-visit-legend-item"><span class="map-a-visit-legend-dot is-visited" aria-hidden="true"></span>訪問済</span>
            <span class="map-a-visit-legend-item"><span class="map-a-visit-legend-dot is-unvisited" aria-hidden="true"></span>未訪問</span>
          </div>
        </div>
        <div class="map-a-layer-control">
          <button id="map-a-layer-trigger" class="map-a-layer-trigger" type="button" aria-label="マップの表示設定" aria-expanded="false">${icons.layers}</button>
          <section id="map-a-layer-panel" class="map-a-layer-panel" role="dialog" aria-label="マップの表示設定" hidden>
            <div class="map-a-layer-panel-head"><strong>マップ表示</strong><button id="map-a-layer-close" type="button" aria-label="閉じる">${icons.close}</button></div>
            <label class="map-a-layer-toggle-row" for="map-a-label-toggle"><span><strong>店名を表示</strong><small>マップ上の店名ラベル</small></span><input id="map-a-label-toggle" type="checkbox" checked><i aria-hidden="true"></i></label>
            <div class="map-a-layer-color-setting">
              <span class="map-a-layer-setting-label">色分け</span>
              <div class="map-a-layer-segments" role="group" aria-label="マーカーの色分け">
                <button type="button" data-map-a-color-mode="lineage" class="is-active" aria-pressed="true">系統</button>
                <button type="button" data-map-a-color-mode="visit" aria-pressed="false">訪問有無</button>
              </div>
            </div>
          </section>
        </div>
        <div class="map-a-center-target" aria-hidden="true"><span>中心</span></div>
        <section class="map-a-card-region" aria-label="地図中心に近い店舗">
          <div class="map-a-card-head"><strong id="map-a-rail-heading">中心から近いお店</strong><span id="map-a-rail-position">0 / 0</span></div>
          <div id="map-a-card-rail" class="map-a-card-rail" tabindex="0"></div>
        </section>
        <div class="map-a-command-dock">
          <button id="map-a-search-trigger" class="map-a-search-trigger" type="button" aria-label="店舗名、駅名、地名を検索">
            ${icons.search}<span class="map-a-search-copy">店名・駅・地名を検索</span>
          </button>
          <button id="map-a-open-toggle" class="map-a-open-toggle is-active" type="button" aria-label="営業中の店舗だけ表示中。全店舗表示に戻す" aria-pressed="true"><span id="map-a-open-label">営業中</span></button>
          <button id="map-a-location-trigger" class="map-a-location-trigger" type="button" aria-label="現在地を表示" aria-pressed="false">
            ${icons.location}
          </button>
          <button id="map-a-adjust-trigger" class="map-a-adjust-trigger" type="button" aria-label="検索・ソート設定" aria-expanded="false">
            ${icons.tune}<span id="map-a-filter-label" class="map-a-filter-label" aria-hidden="true"></span>
          </button>
        </div>
        <button id="map-a-scrim" class="map-a-scrim" type="button" aria-label="検索・ソート設定を閉じる"></button>
        ${renderAdjustPanelMarkup()}
      `;
      mapContainer.appendChild(root);
    }

    if (!document.getElementById('map-a-search-surface')) {
      const searchSurface = document.createElement('section');
      searchSurface.id = 'map-a-search-surface';
      searchSurface.className = 'map-a-search-surface';
      searchSurface.setAttribute('role', 'search');
      searchSurface.setAttribute('aria-hidden', 'true');
      searchSurface.setAttribute('aria-label', '全画面検索');
      searchSurface.innerHTML = `
        <div class="map-a-search-top">
          <div class="map-a-search-row">
            <button id="map-a-search-back" class="map-a-search-back" type="button" aria-label="マップへ戻る">${icons.back}</button>
            <div class="map-a-search-field-wrap">
              ${icons.search}
              <input id="map-a-search-input" class="map-a-search-input" type="search" enterkeyhint="search" autocomplete="off" placeholder="店名・駅名・地名">
              <button id="map-a-search-clear" class="map-a-search-clear" type="button" aria-label="検索文字を消去">×</button>
            </div>
            <button id="map-a-search-submit" class="map-a-search-submit" type="button">検索</button>
          </div>
          <div class="map-a-search-tabs" role="tablist" aria-label="検索対象">
            <button class="map-a-search-tab is-active" type="button" role="tab" data-map-a-search-tab="shops" aria-selected="true">ラーメン店 <span id="map-a-shop-count" hidden></span></button>
            <button class="map-a-search-tab" type="button" role="tab" data-map-a-search-tab="places" aria-selected="false">地名・駅</button>
            <button class="map-a-search-tab" type="button" role="tab" data-map-a-search-tab="photo" aria-selected="false">写真から逆引き</button>
          </div>
        </div>
        <div id="map-a-search-results" class="map-a-search-results"></div>
        <input id="map-a-photo-lookup-input" type="file" accept="image/*,.heic,.heif" hidden>
        ${renderSearchLineagePanelMarkup()}
      `;
      document.body.appendChild(searchSurface);
    }

    ensureSettingsControl();
  }

  function renderAdjustPanelMarkup() {
    return `
      <aside id="map-a-adjust-panel" class="map-a-adjust-panel" role="dialog" aria-modal="true" aria-hidden="true" aria-label="検索・ソート設定">
        <div class="map-a-adjust-head">
          <div class="map-a-adjust-title"><strong>検索・ソート設定</strong><span id="map-a-adjust-subtitle">表示する店舗を選ぶ</span></div>
          <div class="map-a-adjust-head-actions">
            <span id="map-a-adjust-updated-at" class="map-a-adjust-updated-at"></span>
            <button id="map-a-adjust-close" class="map-a-close-button" type="button" aria-label="閉じる">${icons.close}</button>
          </div>
        </div>
        <div class="map-a-adjust-tabs" role="tablist" aria-label="調整項目">
          <button class="map-a-adjust-tab is-active" type="button" role="tab" data-map-a-adjust-tab="filter" aria-selected="true" aria-controls="map-a-adjust-pane-filter">絞り込み</button>
          <button class="map-a-adjust-tab" type="button" role="tab" data-map-a-adjust-tab="sort" aria-selected="false" aria-controls="map-a-adjust-pane-sort">並び順</button>
          <button class="map-a-adjust-tab" type="button" role="tab" data-map-a-adjust-tab="settings" aria-selected="false" aria-controls="map-a-adjust-pane-settings">初期設定</button>
        </div>
        <div class="map-a-adjust-body">
          <section id="map-a-adjust-pane-filter" class="map-a-adjust-pane is-active" role="tabpanel" data-map-a-adjust-pane="filter">
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">表示する店舗</h2>
              <div class="map-a-choice-list map-a-quick-filter-list" role="group" aria-label="表示する店舗">
                ${switchRow('map-a-filter-open', '営業中のみ', '今入れる店に絞る')}
                ${switchRow('map-a-filter-want', '行きたい', '保存した候補だけ表示')}
                ${switchRow('map-a-filter-favorite', 'お気に入り', 'お気に入りの店だけ表示')}
                ${switchRow('map-a-filter-new', '新店舗', '検索画面と同じ新店舗だけ表示')}
                ${switchRow('map-a-filter-unvisited', '未訪問', 'まだ訪れていない店だけ表示')}
                ${switchRow('map-a-filter-visited', '訪問済', '訪問記録がある店だけ表示')}
              </div>
            </div>
            <div class="map-a-control-group">
              <div class="map-a-control-title-row">
                <h2 class="map-a-control-title">系統</h2>
                <span id="map-a-category-summary" class="map-a-control-summary">${IS_JIRO_ONLY_MODE ? '二郎系' : IS_MIXED_MODE ? '家系・二郎系' : '家系'}</span>
              </div>
              <div class="map-a-category-groups">
                ${renderAdjustCategoryGroup('iekei', IS_JIRO_ONLY_MODE ? '二郎系' : '家系')}
                ${IS_JIRO_ONLY_MODE ? '' : renderAdjustCategoryGroup('isse', '壱系')}
                ${IS_MIXED_MODE ? renderAdjustCategoryGroup('jiro', '二郎系') : ''}
              </div>
            </div>
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">曜日・時刻</h2>
              <div class="map-a-schedule-fields">
                <label class="map-a-schedule-field">
                  <span>曜日</span>
                  <select id="map-a-filter-day">
                    <option value="">指定なし</option>
                    <option value="0">日曜日</option>
                    <option value="1">月曜日</option>
                    <option value="2">火曜日</option>
                    <option value="3">水曜日</option>
                    <option value="4">木曜日</option>
                    <option value="5">金曜日</option>
                    <option value="6">土曜日</option>
                  </select>
                </label>
                <label class="map-a-schedule-field">
                  <span>時刻</span>
                  <input id="map-a-filter-time" type="time" aria-label="営業時間で絞り込む時刻">
                </label>
              </div>
              <p class="map-a-schedule-help">曜日と時刻を両方指定すると、その時間に営業する店舗へ絞ります。</p>
            </div>
          </section>
          <section id="map-a-adjust-pane-sort" class="map-a-adjust-pane" role="tabpanel" data-map-a-adjust-pane="sort" hidden>
            <div class="map-a-control-group">
            <h2 class="map-a-control-title">カードの並び順</h2>
            <div class="map-a-choice-list">
              ${radioRow('map-a-sort', 'center', '地図の中心に近い順', '地図を動かした後に近い順へ更新')}
              ${radioRow('map-a-sort', 'current', '現在地・指定地点に近い順', '位置を指定している時に利用できます')}
              ${radioRow('map-a-sort', 'open', '営業中を優先', '営業中の店を距離順で先に表示')}
              ${radioRow('map-a-sort', 'name', IS_JIRO_ONLY_MODE ? 'カテゴリ・店名順' : '店名 あ→ん', IS_JIRO_ONLY_MODE ? '二郎系のカテゴリ順で表示' : '店舗名の五十音順')}
            </div>
            </div>
          </section>
          <section id="map-a-adjust-pane-settings" class="map-a-adjust-pane" role="tabpanel" data-map-a-adjust-pane="settings" hidden>
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">マップに表示する系統の初期設定</h2>
              <p class="map-a-schedule-help">マップの次回起動時と「リセット」時に使います。</p>
              <div class="map-a-category-groups map-a-default-category-groups">
                ${renderDefaultCategoryGroup('iekei', IS_JIRO_ONLY_MODE ? '二郎系' : '家系')}
                ${IS_JIRO_ONLY_MODE ? '' : renderDefaultCategoryGroup('isse', '壱系')}
                ${IS_MIXED_MODE ? renderDefaultCategoryGroup('jiro', '二郎系') : ''}
              </div>
            </div>
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">カード切替時の地図</h2>
              <div class="map-a-choice-list">
                ${radioRow('map-a-card-map', 'zoomout', '範囲を広げる', '画面外の時だけ中心固定で最大2段階縮小')}
                ${radioRow('map-a-card-map', 'keep', '中心を固定', 'カードをめくっても地図を一切動かさない')}
              </div>
            </div>
          </section>
        </div>
        <div class="map-a-adjust-footer">
          <button id="map-a-reset" class="map-a-reset-button" type="button">リセット</button>
          <button id="map-a-apply" class="map-a-apply-button" type="button">完了・<span id="map-a-draft-count">0</span>店表示中</button>
        </div>
      </aside>`;
  }

  function radioRow(name, value, title, helper) {
    return `<label class="map-a-choice-row"><span class="map-a-choice-copy"><strong>${title}</strong><span>${helper}</span></span><input type="radio" name="${name}" value="${value}"></label>`;
  }

  function switchRow(id, title, helper) {
    return `<label class="map-a-switch-row"><span class="map-a-choice-copy"><strong>${title}</strong><span>${helper}</span></span><input id="${id}" type="checkbox"></label>`;
  }

  function getAdjustCategoryOptions(group) {
    if (IS_JIRO_ONLY_MODE) return group === 'iekei' ? JIRO_CATEGORY_OPTIONS.map(option => ({ ...option, group: 'jiro' })) : [];
    if (IS_MIXED_MODE && group === 'jiro') return JIRO_CATEGORY_OPTIONS.map(option => ({ ...option, group: 'jiro' }));
    return Array.from(document.querySelectorAll(`#advanced-filter-modal input.category-${group}`)).map(input => ({
      value: String(input.value || '').trim(),
      label: input.closest('label')?.querySelector('span')?.textContent?.trim() || String(input.value || '').trim(),
      group
    })).filter(option => option.value);
  }

  function renderAdjustCategoryGroup(group, title) {
    const options = getAdjustCategoryOptions(group);
    const buttons = options.map(option => {
      const color = getCategoryUiColor(option.value, option.group || group);
      return `<button class="map-a-category-chip" type="button" data-map-a-category="${escapeMarkup(option.value)}" aria-pressed="false" style="--map-a-category-color:${escapeMarkup(color)}"><span class="map-a-category-dot" aria-hidden="true"></span><span>${escapeMarkup(option.label)}</span></button>`;
    }).join('');
    return `<section class="map-a-category-group" aria-label="${escapeMarkup(title)}">
      <div class="map-a-category-group-head">
        <strong>${escapeMarkup(title)}</strong>
        <button class="map-a-category-group-toggle" type="button" data-map-a-category-group="${escapeMarkup(group)}" aria-pressed="false">${escapeMarkup(title)}をすべて</button>
      </div>
      <div class="map-a-category-grid" role="group" aria-label="${escapeMarkup(title)}の系統">${buttons}</div>
    </section>`;
  }

  function renderDefaultCategoryGroup(group, title) {
    const options = getAdjustCategoryOptions(group);
    const buttons = options.map(option => {
      const color = getCategoryUiColor(option.value, option.group || group);
      return `<button class="map-a-category-chip" type="button" data-map-a-default-category="${escapeMarkup(option.value)}" aria-pressed="false" style="--map-a-category-color:${escapeMarkup(color)}"><span class="map-a-category-dot" aria-hidden="true"></span><span>${escapeMarkup(option.label)}</span></button>`;
    }).join('');
    return `<section class="map-a-category-group" aria-label="${escapeMarkup(title)}の初期設定">
      <div class="map-a-category-group-head">
        <strong>${escapeMarkup(title)}</strong>
        <button class="map-a-category-group-toggle" type="button" data-map-a-default-category-group="${escapeMarkup(group)}" aria-pressed="false">${escapeMarkup(title)}をすべて</button>
      </div>
      <div class="map-a-category-grid" role="group" aria-label="${escapeMarkup(title)}の初期系統">${buttons}</div>
    </section>`;
  }

  function readDefaultFilterCategories() {
    if (IS_JIRO_ONLY_MODE) {
      try {
        const stored = JSON.parse(localStorage.getItem(JIRO_DEFAULT_CATEGORIES_KEY) || '[]');
        return Array.isArray(stored)
          ? stored.map(value => value === '直系' ? '二郎' : value).filter(value => JIRO_CATEGORY_COLORS[value])
          : [];
      } catch (_) {
        return [];
      }
    }
    const categories = window.getDefaultFilterCategories?.();
    return Array.isArray(categories) ? [...categories] : [...(advancedFilterSettings?.categories || [])];
  }

  function renderSearchLineagePanelMarkup() {
    const renderGroup = (group, title) => {
      const buttons = getAdjustCategoryOptions(group).map(option => {
        const color = getCategoryUiColor(option.value, option.group || group);
        return `<button class="map-a-category-chip" type="button" data-map-a-search-category="${escapeMarkup(option.value)}" aria-pressed="false" style="--map-a-category-color:${escapeMarkup(color)}"><span class="map-a-category-dot" aria-hidden="true"></span><span>${escapeMarkup(option.label)}</span></button>`;
      }).join('');
      return `<section class="map-a-search-lineage-group" aria-label="${escapeMarkup(title)}">
        <div class="map-a-category-group-head">
          <strong>${escapeMarkup(title)}</strong>
          <button class="map-a-category-group-toggle" type="button" data-map-a-search-category-group="${escapeMarkup(group)}" aria-label="${escapeMarkup(title)}をまとめて選択・解除" aria-pressed="false">${escapeMarkup(title)}</button>
        </div>
        <div class="map-a-category-grid" role="group" aria-label="${escapeMarkup(title)}の系統">${buttons}</div>
      </section>`;
    };
    return `
      <button id="map-a-search-lineage-scrim" class="map-a-search-lineage-scrim" type="button" aria-label="系統の絞り込みを閉じる"></button>
      <aside id="map-a-search-lineage-panel" class="map-a-search-lineage-panel" role="dialog" aria-modal="true" aria-hidden="true" aria-label="系統で絞り込む">
        <div class="map-a-search-lineage-head">
          <div><strong>系統で絞り込む</strong><span>複数の系統を選べます</span></div>
          <button id="map-a-search-lineage-close" class="map-a-close-button" type="button" aria-label="閉じる">${icons.close}</button>
        </div>
        <div class="map-a-search-lineage-body">
          <button class="map-a-search-lineage-all is-active" type="button" data-map-a-search-category-all aria-pressed="true">すべての系統</button>
          ${renderGroup('iekei', IS_JIRO_ONLY_MODE ? '二郎系' : '家系')}
          ${IS_JIRO_ONLY_MODE ? '' : renderGroup('isse', '壱系')}
          ${IS_MIXED_MODE ? renderGroup('jiro', '二郎系') : ''}
        </div>
        <div class="map-a-search-lineage-footer">
          <button id="map-a-search-lineage-reset" class="map-a-reset-button" type="button">すべて表示</button>
          <button id="map-a-search-lineage-done" class="map-a-apply-button" type="button">完了</button>
        </div>
      </aside>`;
  }

  function getAllAdjustCategoryValues() {
    return getCategoryGroups().flatMap(group => getAdjustCategoryOptions(group).map(option => option.value));
  }

  function getCategoryGroups() {
    return IS_JIRO_ONLY_MODE ? ['iekei'] : IS_MIXED_MODE ? ['iekei', 'isse', 'jiro'] : ['iekei', 'isse'];
  }

  function getCategoryUiColor(category, group = '') {
    if (IS_JIRO_ONLY_MODE || group === 'jiro') return JIRO_CATEGORY_COLORS[category] || JIRO_CATEGORY_COLORS['不明'];
    return typeof getMapCategoryColor === 'function' ? getMapCategoryColor(category, 'iekei') : '#64748b';
  }

  function getEffectiveAdjustCategorySelection() {
    if (advancedFilterSettings?.noCategories) return new Set();
    const stored = advancedFilterSettings?.categories || [];
    return new Set(stored.length ? stored : getAllAdjustCategoryValues());
  }

  function storeAdjustCategorySelection(selected) {
    const allValues = getAllAdjustCategoryValues();
    advancedFilterSettings.noCategories = selected.size === 0;
    advancedFilterSettings.categories = allValues.length > 0 && allValues.every(value => selected.has(value))
      ? []
      : allValues.filter(value => selected.has(value));
  }

  function escapeMarkup(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureSettingsControl() {
    const accountItem = document.getElementById('settings-account-menu-item');
    const parent = accountItem?.parentElement;
    if (!parent || document.getElementById('map-ui-mode-setting')) return;
    const setting = document.createElement('section');
    setting.id = 'map-ui-mode-setting';
    setting.className = 'map-ui-mode-setting';
    setting.innerHTML = `
      <div class="map-ui-mode-setting-head">
        <div class="map-ui-mode-setting-icon" aria-hidden="true">🗺️</div>
        <div class="map-ui-mode-setting-copy"><strong>マップのデザイン</strong><span>いつでも旧表示へ戻せます</span></div>
      </div>
      <div class="map-ui-mode-segments" role="group" aria-label="マップのデザイン">
        <button class="map-ui-mode-segment" type="button" data-map-ui-mode="a">新デザイン</button>
        <button class="map-ui-mode-segment" type="button" data-map-ui-mode="classic">クラシック</button>
      </div>`;
    accountItem.insertAdjacentElement('afterend', setting);
  }

  function bindUiEvents() {
    const root = document.getElementById('map-a-root');
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    document.getElementById('map-a-search-trigger')?.addEventListener('click', event => {
      if (event.target.closest('[data-map-a-search-result-clear]')) {
        clearSearchResultMode();
        return;
      }
      openSearchSurface();
    });
    document.getElementById('map-a-open-toggle')?.addEventListener('click', toggleOpenOnlyImmediately);
    document.getElementById('map-a-location-trigger')?.addEventListener('click', handleCurrentLocationClick);
    document.getElementById('map-a-adjust-trigger')?.addEventListener('click', openAdjustPanel);
    document.getElementById('map-a-adjust-close')?.addEventListener('click', () => closeAdjustPanel());
    document.getElementById('map-a-scrim')?.addEventListener('click', () => closeAdjustPanel());
    document.getElementById('map-a-reset')?.addEventListener('click', resetAdjustDraft);
    document.getElementById('map-a-apply')?.addEventListener('click', () => closeAdjustPanel());
    document.querySelectorAll('[data-map-a-adjust-tab]').forEach(button => {
      button.addEventListener('click', () => switchAdjustTab(button.dataset.mapAAdjustTab));
    });
    document.querySelectorAll('[data-map-a-category], [data-map-a-category-group]').forEach(button => {
      button.addEventListener('click', handleAdjustCategoryClick);
    });
    document.querySelectorAll('[data-map-a-default-category], [data-map-a-default-category-group]').forEach(button => {
      button.addEventListener('click', handleDefaultCategoryClick);
    });
    document.getElementById('map-a-color-legend-items')?.addEventListener('click', handleLegendCategoryClick);
    document.getElementById('map-a-layer-trigger')?.addEventListener('click', toggleMapLayerPanel);
    document.getElementById('map-a-layer-close')?.addEventListener('click', closeMapLayerPanel);
    document.getElementById('map-a-label-toggle')?.addEventListener('change', event => {
      state.mapLabelsVisible = !!event.target.checked;
      syncMapShopLabels();
    });
    document.querySelectorAll('[data-map-a-color-mode]').forEach(button => {
      button.addEventListener('click', () => setMapColorMode(button.dataset.mapAColorMode));
    });
    document.querySelectorAll('#map-a-adjust-panel input, #map-a-adjust-panel select').forEach(control => {
      control.addEventListener('change', handleAdjustInputChange);
    });

    const rail = document.getElementById('map-a-card-rail');
    rail?.addEventListener('pointerdown', beginRailGesture, { passive: true });
    rail?.addEventListener('pointermove', moveRailGesture, { passive: false });
    rail?.addEventListener('pointerup', finishRailGesture, { passive: true });
    rail?.addEventListener('pointercancel', cancelRailGesture, { passive: true });
    rail?.addEventListener('lostpointercapture', cancelRailGesture, { passive: true });
    rail?.addEventListener('scroll', handleRailScroll, { passive: true });
    rail?.addEventListener('scrollend', handleRailScrollEnd, { passive: true });
    rail?.addEventListener('click', handleRailClick);
    rail?.addEventListener('keydown', event => {
      if (event.target !== rail || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      const activeIndex = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      settleRailAt(Math.max(0, Math.min(state.visibleShops.length - 1, activeIndex + direction)), true, true);
    });

    document.getElementById('map-a-search-back')?.addEventListener('click', closeSearchSurface);
    const searchInput = document.getElementById('map-a-search-input');
    searchInput?.addEventListener('input', () => {
      if (state.searchResultMode?.active && !searchInput.value.trim()) clearSearchResultMode();
      if (state.searchTab === 'places') schedulePlaceSearch();
      else {
        cancelPlaceSearch(false);
        cancelGoogleSearch(true);
        state.googleExpanded = false;
        renderSearchResults();
      }
    });
    searchInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && state.searchTab === 'places') {
        event.preventDefault();
        runPlaceSearch(searchInput.value.trim());
      } else if (event.key === 'Enter' && state.searchTab === 'shops') {
        event.preventDefault();
        submitShopSearch();
      }
    });
    document.getElementById('map-a-search-submit')?.addEventListener('click', submitCurrentSearch);
    document.getElementById('map-a-search-clear')?.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = '';
      if (state.searchResultMode?.active) clearSearchResultMode();
      cancelPlaceSearch(true);
      cancelGoogleSearch(true);
      state.googleExpanded = false;
      state.placeError = '';
      state.googleError = '';
      renderSearchResults();
      searchInput.focus();
    });
    document.querySelectorAll('[data-map-a-search-tab]').forEach(button => {
      button.addEventListener('click', () => setSearchTab(button.dataset.mapASearchTab));
    });
    document.getElementById('map-a-search-results')?.addEventListener('click', handleSearchResultClick);
    document.getElementById('map-a-photo-lookup-input')?.addEventListener('change', handleBrowserPhotoLookup);
    document.getElementById('map-a-search-lineage-scrim')?.addEventListener('click', closeSearchLineagePanel);
    document.getElementById('map-a-search-lineage-close')?.addEventListener('click', closeSearchLineagePanel);
    document.getElementById('map-a-search-lineage-done')?.addEventListener('click', closeSearchLineagePanel);
    document.getElementById('map-a-search-lineage-reset')?.addEventListener('click', resetShopSearchCategories);
    document.querySelectorAll('[data-map-a-search-category]').forEach(button => {
      button.addEventListener('click', () => toggleShopSearchCategory(button.dataset.mapASearchCategory));
    });
    document.querySelectorAll('[data-map-a-search-category-group]').forEach(button => {
      button.addEventListener('click', () => toggleShopSearchCategoryGroup(button.dataset.mapASearchCategoryGroup));
    });
    document.querySelector('[data-map-a-search-category-all]')?.addEventListener('click', resetShopSearchCategories);
    document.addEventListener('click', event => {
      if (!event.target.closest('.map-a-result-more')) closeSearchResultMenus();
    });

    document.querySelectorAll('[data-map-ui-mode]').forEach(button => {
      button.addEventListener('click', () => setMapUiMode(button.dataset.mapUiMode));
    });

    document.querySelectorAll('.bottom-nav .nav-item').forEach(button => {
      button.addEventListener('click', closeAdjustPanel);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (closeSearchResultMenus()) {
        event.preventDefault();
        return;
      }
      if (document.getElementById('map-a-search-surface')?.classList.contains('is-open')) closeSearchSurface();
      else if (!document.getElementById('map-a-layer-panel')?.hidden) closeMapLayerPanel();
      else closeAdjustPanel();
    });

    window.addEventListener('popstate', () => {
      const isOpen = document.getElementById('map-a-search-surface')?.classList.contains('is-open');
      if (isOpen && !history.state?.[SEARCH_HISTORY_STATE]) {
        closeSearchSurface({ fromHistory: true });
      } else if (!isOpen && history.state?.[SEARCH_HISTORY_STATE] && isMapUiA()) {
        openSearchSurface({ fromHistory: true });
      } else if (history.state?.[SEARCH_HISTORY_STATE] && !isMapUiA()) {
        clearSearchHistoryFlag();
      }
    });

    if (history.state?.[SEARCH_HISTORY_STATE]) {
      if (isMapUiA()) openSearchSurface({ fromHistory: true });
      else clearSearchHistoryFlag();
    }
  }

  function patchClassicMapFunctions() {
    if (window.__mapDiscoveryV2Patched) return;
    window.__mapDiscoveryV2Patched = true;

    if (typeof initMap === 'function') {
      const classicInitMap = initMap;
      initMap = function mapDiscoveryInitMap(...args) {
        // The app may initialize once from cache and again after a fresh API response.
        if (map?.getContainer?.()) {
          updateMarkers();
          installMapHooks();
          scheduleRailRefresh({ preserveActive: true });
          return map;
        }
        const result = classicInitMap.apply(this, args);
        installMapHooks();
        scheduleRailRefresh(resumePreviousMap ? { preserveActive: true, scrollToShopId: state.activeShopId } : { selectFirst: true, resetScroll: true });
        return result;
      };
    }

    if (typeof updateMarkers === 'function') {
      const classicUpdateMarkers = updateMarkers;
      updateMarkers = function mapDiscoveryUpdateMarkers(...args) {
        clearMapShopLabels();
        let result;
        let markerError = null;
        try {
          result = classicUpdateMarkers.apply(this, args);
        } catch (error) {
          markerError = error;
        }
        ensureSearchResultMarkers();
        ensureForcedMarker();
        installMapHooks();
        decorateCurrentMarkers();
        applyMapLayerMarkerStyles();
        rebuildMapShopLabels();
        syncMapShopLabels();
        scheduleRailRefresh({ preserveActive: true });
        if (markerError && !isSearchResultMode()) throw markerError;
        if (markerError) console.warn('検索結果の店舗ピンを補完しました:', markerError);
        return result;
      };
    }

    if (typeof renderShopList === 'function') {
      const classicRenderShopList = renderShopList;
      renderShopList = function mapDiscoveryRenderShopList(...args) {
        const result = classicRenderShopList.apply(this, args);
        scheduleRailRefresh({ preserveActive: true });
        return result;
      };
    }

    if (typeof focusShop === 'function') {
      const classicFocusShop = focusShop;
      focusShop = function mapDiscoveryFocusShop(shopId, options = {}) {
        if (!isMapUiA()) return classicFocusShop.call(this, shopId);
        const shop = findShop(shopId);
        if (!shop || !map) return;
        state.forceShopId = shop.id;
        renderRail({ preserveActive: true, scrollToShopId: shop.id });
        selectMapShop(shop.id);
        if (options.centerOnTarget) {
          markProgrammaticMapMove('external-focus-center');
          setMapViewAtFocus([Number(shop.lat), Number(shop.lng)], map.getZoom(), { animate: true });
          return;
        }
        if (!isShopInSafeArea(shop)) {
          markProgrammaticMapMove('external-focus');
          panShopIntoSafeArea(shop, true);
        }
      };
    }

    if (typeof openSettingsModal === 'function') {
      const classicOpenSettings = openSettingsModal;
      openSettingsModal = function mapDiscoveryOpenSettings(...args) {
        syncMapUiSetting();
        return classicOpenSettings.apply(this, args);
      };
    }

  }

  function installMapHooks() {
    if (!map || state.mapHooksTarget === map) return;
    state.mapHooksTarget = map;
    ensureMapShopLabelPane();
    map.on('zoomstart', handleMapZoomStart);
    map.on('zoomend', handleMapZoomEnd);
    map.on('moveend', handleMapMoveEnd);
    map.on('dragstart', handleMapDragStart);
  }

  function handleMapZoomStart() {
    if (locationCameraMoveInProgress) return;
    window.clearTimeout(state.mapMoveTimer);
    state.mapGestureSource = 'zoom';
    state.mapGestureStartCenter = null;
    state.mapGestureStartZoom = null;
    state.zoomMoveEndPending = true;
    // ユーザーが縮尺を操作したら、位置情報の取得は続けたまま
    // カメラの自動追従だけを解除する。
    window.pauseLocationUpdatesForMapInteraction?.();
  }

  function handleMapZoomEnd() {
    // Zooming changes only the map scale. Keep the selected card and rail order intact.
    syncMapShopLabels();
  }

  function handleMapDragStart() {
    window.clearTimeout(state.mapMoveTimer);
    state.mapGestureSource = 'user-pan';
    state.mapGestureStartCenter = map?.getCenter?.() || null;
    state.mapGestureStartZoom = map?.getZoom?.() ?? null;
    if (isMapUiA()) map.closePopup();
    window.pauseLocationUpdatesForMapInteraction?.();
  }

  function handleMapMoveEnd() {
    syncMapShopLabels();

    if (state.zoomMoveEndPending) {
      state.zoomMoveEndPending = false;
      state.mapGestureSource = '';
      state.mapGestureStartCenter = null;
      state.mapGestureStartZoom = null;
      if (state.programmaticMapMove) {
        window.clearTimeout(state.programmaticClearTimer);
        state.programmaticMapMove = '';
      }
      return;
    }

    if (state.programmaticMapMove) {
      window.clearTimeout(state.programmaticClearTimer);
      state.programmaticMapMove = '';
      state.mapGestureSource = '';
      state.mapGestureStartCenter = null;
      state.mapGestureStartZoom = null;
      return;
    }

    const isUserPan = state.mapGestureSource === 'user-pan';
    const startCenter = state.mapGestureStartCenter;
    const startZoom = state.mapGestureStartZoom;
    state.mapGestureSource = '';
    state.mapGestureStartCenter = null;
    state.mapGestureStartZoom = null;

    if (!isMapUiA() || document.body.classList.contains('map-a-search-open') || !isUserPan) return;

    const movedPixels = startCenter && Number.isFinite(startZoom)
      ? map.project(startCenter, startZoom).distanceTo(map.project(map.getCenter(), startZoom))
      : Number.POSITIVE_INFINITY;
    if (movedPixels < 8) return;

    window.clearTimeout(state.mapMoveTimer);
    state.mapMoveTimer = window.setTimeout(() => {
      releaseForcedShopMarker();
      renderRail({ selectFirst: true, resetScroll: true });
    }, 210);
  }

  function ensureForcedMarker() {
    if (!isMapUiA() || !map || typeof L === 'undefined' || !state.forceShopId || markers?.[state.forceShopId]) return;
    const shop = findShop(state.forceShopId);
    if (!shop || !Number.isFinite(Number(shop.lat)) || !Number.isFinite(Number(shop.lng))) return;
    const categoryColor = getMapLayerMarkerColor(shop);
    const marker = L.circleMarker([Number(shop.lat), Number(shop.lng)], {
      radius: String(selectedMapShopId) === String(shop.id) ? 11 : 9,
      color: state.mapColorMode === 'visit' ? '#25211f' : '#ffffff',
      weight: String(selectedMapShopId) === String(shop.id) ? 4 : 2,
      opacity: 1,
      fillColor: categoryColor,
      fillOpacity: 1
    }).addTo(map);
    marker.__mapDiscoveryForced = true;
    markers[shop.id] = marker;
    markerHalos[shop.id] = [];
  }

  function ensureSearchResultMarkers() {
    if (!isSearchResultMode() || !map || typeof L === 'undefined') return;
    getFilteredShops().forEach(shop => {
      if (markers?.[shop.id]) return;
      const position = [Number(shop.lat), Number(shop.lng)];
      if (!position.every(Number.isFinite)) return;
      const marker = L.circleMarker(position, {
        radius: String(state.activeShopId) === String(shop.id) ? 11 : 9,
        color: state.mapColorMode === 'visit' ? '#25211f' : '#ffffff',
        weight: String(state.activeShopId) === String(shop.id) ? 4 : 2,
        opacity: 1,
        fillColor: getMapLayerMarkerColor(shop),
        fillOpacity: 1
      }).addTo(map);
      markers[shop.id] = marker;
      markerHalos[shop.id] = [];
    });
  }

  function releaseForcedShopMarker() {
    const forcedId = state.forceShopId;
    state.forceShopId = null;
    const forcedMarker = forcedId ? markers?.[forcedId] : null;
    if (!forcedMarker?.__mapDiscoveryForced) return;
    try { forcedMarker.remove(); } catch (_) {}
    delete markers[forcedId];
    delete markerHalos[forcedId];
    const label = mapShopLabels[forcedId];
    if (label) {
      try { label.remove(); } catch (_) {}
      delete mapShopLabels[forcedId];
    }
  }

  function decorateCurrentMarkers() {
    if (!map || typeof markers !== 'object') return;
    Object.entries(markers).forEach(([shopId, marker]) => {
      if (!marker || marker.__mapDiscoveryBound) return;
      marker.__mapDiscoveryBound = true;
      marker.on('click', () => {
        if (!isMapUiA()) return;
        state.forceShopId = shopId;
        selectMapShop(shopId);
        renderRail({ preserveActive: true, scrollToShopId: shopId });
      });
      if (isMapUiA() && marker.getPopup()) marker.unbindPopup();
    });
  }

  function ensureMapShopLabelPane() {
    if (!map) return;
    [
      ['mapShopLabelPane', '450'],
      ['mapSelectedShopMarkerPane', '670'],
      ['mapSelectedShopLabelPane', '680']
    ].forEach(([name, zIndex]) => {
      if (!map.getPane(name)) map.createPane(name);
      const pane = map.getPane(name);
      pane.style.zIndex = zIndex;
      pane.style.pointerEvents = 'none';
    });
  }

  function clearMapShopLabels() {
    Object.values(mapShopLabels).forEach(label => {
      try { label.remove(); } catch (_) {}
    });
    mapShopLabels = {};
  }

  // The shop API currently has no prefecture field. Treat Tokyo, Chiba,
  // Saitama and Kanagawa as one region and identify their combined outline
  // from shop coordinates. This avoids a broad rectangle pulling nearby
  // shops in Ibaraki, Gunma, Yamanashi and Shizuoka into the dense-area rule.
  const MAP_LABEL_CAPITAL_REGION_POLYGON = [
    [35.128, 139.026], [35.157, 139.620], [35.120, 139.860],
    [35.178, 140.105], [35.276, 140.335], [35.526, 140.515],
    [35.693, 140.870], [35.845, 140.755], [35.905, 140.360],
    [36.105, 140.115], [36.090, 139.900], [36.235, 139.770],
    [36.285, 139.485], [36.205, 139.170], [36.095, 138.930],
    [35.900, 138.765], [35.690, 138.875], [35.510, 139.035],
    [35.365, 139.105]
  ];

  const MAP_LABEL_TOKAI_POLYGON = [
    [33.700, 135.920], [34.170, 136.580], [34.570, 137.050],
    [34.610, 138.060], [34.890, 138.760], [35.060, 139.190],
    [35.630, 138.930], [35.720, 138.250], [36.030, 137.590],
    [36.470, 137.020], [36.350, 136.420], [35.820, 136.020],
    [35.190, 135.840], [34.620, 135.760]
  ];

  const MAP_LABEL_KANSAI_POLYGON = [
    [33.430, 135.080], [33.850, 135.720], [34.130, 136.520],
    [34.640, 136.980], [35.160, 136.750], [35.690, 136.300],
    [35.790, 135.500], [35.650, 134.650], [35.380, 134.200],
    [34.870, 134.420], [34.540, 134.690], [34.150, 134.910]
  ];

  function isPointInMapLabelRegion(lat, lng, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const [latA, lngA] = polygon[index];
      const [latB, lngB] = polygon[previous];
      const crosses = (latA > lat) !== (latB > lat)
        && lng < ((lngB - lngA) * (lat - latA)) / (latB - latA) + lngA;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function isCapitalRegionShop(shop) {
    const lat = Number(shop?.lat);
    const lng = Number(shop?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return isPointInMapLabelRegion(lat, lng, MAP_LABEL_CAPITAL_REGION_POLYGON);
  }

  function isTokaiKansaiShop(shop) {
    const lat = Number(shop?.lat);
    const lng = Number(shop?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return isPointInMapLabelRegion(lat, lng, MAP_LABEL_TOKAI_POLYGON)
      || isPointInMapLabelRegion(lat, lng, MAP_LABEL_KANSAI_POLYGON);
  }

  function getMapLabelMinZoom(shop) {
    if (shop?.category === '直系' || shop?.category === '二郎') return MAP_LABEL_CHOKUSEI_MIN_ZOOM;
    if (isCapitalRegionShop(shop)) return MAP_LABEL_CAPITAL_REGION_MIN_ZOOM;
    if (isTokaiKansaiShop(shop)) return MAP_LABEL_TOKAI_KANSAI_MIN_ZOOM;
    return MAP_LABEL_OTHER_REGION_MIN_ZOOM;
  }

  function rebuildMapShopLabels() {
    if (!map || typeof L === 'undefined') return;
    ensureMapShopLabelPane();
    const markerIds = new Set(Object.keys(markers || {}));
    shops.forEach(shop => {
      if (!markerIds.has(String(shop.id))) return;
      const labelText = getShopMapLabel(shop);
      if (!labelText) return;
      const content = document.createElement('span');
      content.textContent = labelText;
      mapShopLabels[shop.id] = L.tooltip({
        permanent: true,
        interactive: false,
        direction: 'bottom',
        offset: [0, MAP_LABEL_OFFSET_Y],
        opacity: 1,
        pane: 'mapShopLabelPane',
        className: 'map-shop-label'
      }).setLatLng([Number(shop.lat), Number(shop.lng)]).setContent(content);
      mapShopLabels[shop.id].__mapDiscoveryOffsetY = MAP_LABEL_OFFSET_Y;
      mapShopLabels[shop.id].__mapDiscoveryMinZoom = getMapLabelMinZoom(shop);
    });
  }

  function syncMapShopLabels() {
    if (!map) return;
    const currentZoom = map.getZoom();
    const canShowAny = currentZoom >= MAP_LABEL_CHOKUSEI_MIN_ZOOM;
    const bounds = canShowAny ? map.getBounds().pad(0.1) : null;
    Object.entries(mapShopLabels).forEach(([shopId, label]) => {
      const isSelected = String(shopId) === String(state.activeShopId);
      const pane = isSelected ? 'mapSelectedShopLabelPane' : 'mapShopLabelPane';
      const offsetY = isSelected
        ? MAP_SELECTED_LABEL_OFFSET_Y
        : MAP_LABEL_OFFSET_Y;
      let shown = map.hasLayer(label);
      if (label.__mapDiscoveryOffsetY !== offsetY || label.options.pane !== pane) {
        label.__mapDiscoveryOffsetY = offsetY;
        label.options.offset = [0, offsetY];
        label.options.pane = pane;
        if (shown) {
          label.remove();
          shown = false;
        }
      }
      const canShow = state.mapLabelsVisible && currentZoom >= (label.__mapDiscoveryMinZoom ?? MAP_LABEL_OTHER_REGION_MIN_ZOOM);
      const shouldShow = canShow && !!markers?.[shopId] && bounds?.contains(label.getLatLng());
      if (shouldShow && !shown) label.addTo(map);
      if (!shouldShow && shown) label.remove();
      label.getElement?.()?.classList.toggle('is-selected', isSelected);
    });
  }

  function mapLabelGraphemes(value) {
    const text = String(value ?? '').normalize('NFC').trim();
    if (!text) return [];
    if (labelSegmenter) return Array.from(labelSegmenter.segment(text), part => part.segment);
    return Array.from(text);
  }

  function getShopMapLabel(shop) {
    const explicitMapLabel = String(shop?.mapLabel ?? '').normalize('NFC').trim();
    // mapLabelを明示した店舗は、入力値をそのまま表示する。
    if (explicitMapLabel) return explicitMapLabel;

    const raw = [shop?.shortName, shop?.['店舗名省略'], shop?.['店舗名の省略']]
      .find(value => String(value ?? '').trim()) ?? shop?.name ?? '';
    const labelWithoutBoilerplate = String(raw)
      .replace(/【[^】]*】/gu, '')
      .replace(/家系総本店/gu, '')
      .replace(/[\s　]+/gu, '')
      .trim();
    const graphemes = mapLabelGraphemes(labelWithoutBoilerplate);
    if (graphemes.length > MAP_LABEL_MAX_GRAPHEMES && !state.warnedLongLabels.has(shop.id)) {
      state.warnedLongLabels.add(shop.id);
      console.warn(`地図上の店舗名は最大4文字です（表示時に省略）: ${shop.name}`);
    }
    return graphemes.slice(0, MAP_LABEL_MAX_GRAPHEMES).join('');
  }

  function scheduleRailRefresh(options = {}) {
    if (state.refreshFrame) cancelAnimationFrame(state.refreshFrame);
    state.refreshFrame = requestAnimationFrame(() => {
      state.refreshFrame = 0;
      if (isMapUiA()) renderRail(options);
      if (document.getElementById('map-a-search-surface')?.classList.contains('is-open')) renderSearchResults();
      syncAllControls();
    });
  }

  function isSearchResultMode() {
    return state.searchResultMode?.active === true;
  }

  function hasValidMapCoordinates(shop) {
    return shop?.lat != null && shop?.lng != null &&
      String(shop.lat).trim() !== '' && String(shop.lng).trim() !== '' &&
      Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng)) &&
      Math.abs(Number(shop.lat)) <= 90 && Math.abs(Number(shop.lng)) <= 180;
  }

  window.getMapDiscoverySearchResultIds = () => isSearchResultMode()
    ? [...state.searchResultMode.shopIds]
    : null;
  window.getMapDiscoverySearchResultOpenOnly = () => isSearchResultMode()
    ? !!state.searchResultMode.openOnly
    : false;

  function getSearchResultShopIds(query) {
    const normalized = normalizeSearch(query);
    const selectedCategories = Array.from(getEffectiveShopSearchCategorySelection());
    const hasCategoryFilter = state.shopSearchCategories !== null;
    const hasNewFilter = state.shopSearchNewOnly;
    const center = getMapFocusLatLng();
    const distanceOrigin = userLocation || center;
    let candidates = (Array.isArray(shops) ? shops : []).filter(shop =>
      shop.name !== 'ダミー' && hasValidMapCoordinates(shop)
    );
    if (hasCategoryFilter) candidates = candidates.filter(shop => selectedCategories.includes(shop.category));
    if (hasNewFilter) candidates = candidates.filter(hasNewShopMarker);
    candidates = candidates.map(shop => ({
      shop,
      rank: getShopSearchRank(shop, normalized),
      distance: calculateDistance(distanceOrigin.lat, distanceOrigin.lng, Number(shop.lat), Number(shop.lng)),
      openDate: getShopOpenSortValue(shop)
    })).filter(item => Number.isFinite(item.rank));
    candidates.sort((a, b) => {
      if (state.shopSearchSort === 'distance') {
        return (a.distance - b.distance) || (a.rank - b.rank) || compareShopSearchNames(a, b);
      }
      if (state.shopSearchSort === 'open') {
        const aHasDate = Number.isFinite(a.openDate);
        const bHasDate = Number.isFinite(b.openDate);
        if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
        if (aHasDate && a.openDate !== b.openDate) return b.openDate - a.openDate;
      }
      return (a.rank - b.rank) || compareShopSearchNames(a, b) || (a.distance - b.distance);
    });
    return candidates.map(item => item.shop.id);
  }

  function syncSearchResultModeControls() {
    const mode = state.searchResultMode;
    const trigger = document.getElementById('map-a-search-trigger');
    const copy = trigger?.querySelector('.map-a-search-copy');
    const filterLabel = document.getElementById('map-a-filter-label');
    if (trigger) {
      trigger.classList.toggle('is-search-result-mode', !!mode?.active);
      const resultLabel = getSearchResultModeLabel(mode);
      trigger.setAttribute('aria-label', mode?.active
        ? `${resultLabel}の検索結果。検索結果を解除`
        : '店舗名、駅名、地名を検索');
      trigger.querySelector('.map-a-search-result-clear')?.remove();
      if (mode?.active) {
        trigger.insertAdjacentHTML('beforeend', '<span class="map-a-search-result-clear" data-map-a-search-result-clear aria-label="検索結果を解除">×</span>');
      }
    }
    if (copy) {
      copy.innerHTML = mode?.active
        ? `<span class="map-a-search-result-query">${escapeText(getSearchResultModeLabel(mode))}</span>`
        : '店名・駅・地名を検索';
    }
    if (filterLabel) {
      filterLabel.textContent = mode?.active
        ? (mode.sort === 'distance' ? '距離順' : '名前順')
        : '';
      filterLabel.classList.toggle('is-visible', !!mode?.active);
      filterLabel.setAttribute('aria-hidden', String(!mode?.active));
    }
  }

  function getSearchResultModeLabel(mode = state.searchResultMode) {
    const query = String(mode?.query || '').trim();
    if (query) return `「${query}」 ${mode.totalCount}件`;
    const hasCategoryFilter = state.shopSearchCategories !== null;
    const hasNewFilter = state.shopSearchNewOnly;
    if (hasCategoryFilter || hasNewFilter) {
      const conditions = [];
      if (hasCategoryFilter) conditions.push(getShopSearchCategorySummary());
      if (hasNewFilter) conditions.push('新店舗');
      return `${conditions.join('・')} ${mode.totalCount}件`;
    }
    return '店名・駅・地名を検索';
  }

  function refreshSearchResultMap(options = {}) {
    const token = ++state.searchResultRenderToken;
    window.clearTimeout(state.railSettleTimer);
    window.clearTimeout(state.mapMoveTimer);
    renderShopList();
    renderRail(options);
    updateMarkers();

    // Leaflet の描画と重なっても、検索対象のピン・店舗名を確実に再同期する。
    const resync = () => {
      if (token !== state.searchResultRenderToken || !map) return;
      map.invalidateSize({ pan: false, animate: false });
      syncMapShopLabels();
      applyMapLayerMarkerStyles();
    };
    requestAnimationFrame(resync);
    window.setTimeout(resync, 160);
  }

  function enterSearchResultMode(shop, query) {
    if (!shop) return;
    const normalizedQuery = String(query || '').trim();
    const hasSearchFilter = state.shopSearchCategories !== null || state.shopSearchNewOnly;
    if (!normalizedQuery && !hasSearchFilter) return;
    const mode = state.searchResultMode;
    if (!mode.active) {
      mode.previous = {
        sort: state.sort,
        showOpenOnly: !!showOpenOnly,
        nearbyMode: !!nearbyMode
      };
    }
    mode.active = true;
    mode.query = normalizedQuery;
    mode.shopIds = getSearchResultShopIds(mode.query);
    if (!mode.shopIds.includes(shop.id)) mode.shopIds.push(shop.id);
    mode.totalCount = mode.shopIds.length;
    mode.openOnly = false;
    mode.sort = state.shopSearchSort === 'distance' ? 'distance' : 'name';
    state.forceShopId = null;
    state.activeShopId = shop.id;
    syncSearchResultModeControls();
    syncAllControls();
    refreshSearchResultMap({ preserveActive: true, scrollToShopId: shop.id });
  }

  function clearSearchResultMode() {
    const mode = state.searchResultMode;
    if (!mode.active) return;
    const previous = mode.previous;
    mode.active = false;
    mode.query = '';
    mode.shopIds = [];
    mode.totalCount = 0;
    mode.openOnly = false;
    mode.previous = null;
    state.forceShopId = null;
    if (previous) {
      state.sort = previous.sort;
      showOpenOnly = previous.showOpenOnly;
    }
    syncSearchResultModeControls();
    syncAllControls();
    refreshSearchResultMap({ selectFirst: true, resetScroll: true });
  }

  function getFilteredShops(overrides = {}) {
    const searchMode = state.searchResultMode;
    if (searchMode?.active) {
      const ids = new Set(searchMode.shopIds.map(id => String(id)));
      let result = (Array.isArray(shops) ? shops : []).filter(shop =>
        ids.has(String(shop.id)) && hasValidMapCoordinates(shop) && shop.name !== 'ダミー'
      );
      if (searchMode.openOnly) result = result.filter(shop => isOpenNow(shop.openingHours));
      return result;
    }
    const filter = {
      openOnly: overrides.openOnly ?? !!showOpenOnly,
      want: overrides.want ?? !!advancedFilterSettings?.wantToGo,
      favorite: overrides.favorite ?? !!advancedFilterSettings?.favorite,
      newShop: overrides.newShop ?? !!advancedFilterSettings?.newShop,
      unvisited: overrides.unvisited ?? !!advancedFilterSettings?.unvisited,
      visited: overrides.visited ?? !!advancedFilterSettings?.visited
    };
    let result = (Array.isArray(shops) ? shops : []).filter(shop =>
      hasValidMapCoordinates(shop) && shop.name !== 'ダミー'
    );
    const settings = advancedFilterSettings || { categories: [], day: '', time: '' };
    if (settings.noCategories) return [];
    if (settings.categories?.length) result = result.filter(shop => settings.categories.includes(shop.category));
    if (filter.want) result = result.filter(shop => visits?.[shop.id]?.wantToGo);
    if (filter.favorite) result = result.filter(shop => visits?.[shop.id]?.favorite);
    if (filter.newShop) result = result.filter(hasNewShopMarker);
    if (filter.unvisited) result = result.filter(shop => !visits?.[shop.id]?.logs?.length);
    if (filter.visited) result = result.filter(shop => !!visits?.[shop.id]?.logs?.length);
    if (settings.day !== '' && settings.time !== '') {
      result = result.filter(shop => isOpenAtDayTime(shop.openingHours, settings.day, settings.time));
    }
    if (filter.openOnly) result = result.filter(shop => isOpenNow(shop.openingHours));
    return result;
  }

  function getMapFocusLatLng() {
    if (!map?.getSize || !map?.containerPointToLatLng) {
      return map?.getCenter?.() || { lat: 35.45, lng: 139.62 };
    }
    const size = map.getSize();
    return map.containerPointToLatLng([size.x / 2, size.y * MAP_FOCUS_Y_RATIO]);
  }

  function setMapViewAtFocus(latLng, zoom, options = {}) {
    if (!map?.project || !map?.unproject || !map?.getSize) return;
    const shouldSelectNearest = options.selectNearest === true;
    const mapOptions = { ...options };
    delete mapOptions.selectNearest;
    if (!isMapUiA()) {
      map.setView(latLng, zoom, mapOptions);
      return;
    }

    let selectionSettled = false;
    let selectionFallbackTimer = 0;
    const selectNearestAfterMove = () => {
      if (!shouldSelectNearest || selectionSettled) return;
      selectionSettled = true;
      window.clearTimeout(selectionFallbackTimer);
      map.off?.('moveend', selectNearestAfterMove);
      releaseForcedShopMarker();
      renderRail({ selectFirst: true, resetScroll: true });
    };
    if (shouldSelectNearest && map.once) {
      map.once('moveend', selectNearestAfterMove);
    }

    const size = map.getSize();
    const target = map.project(latLng, zoom);
    const center = target.add(L.point(0, size.y * (0.5 - MAP_FOCUS_Y_RATIO)));
    map.setView(map.unproject(center, zoom), zoom, mapOptions);
    if (shouldSelectNearest && !selectionSettled) {
      // Leaflet does not emit moveend when the requested camera is already equal.
      selectionFallbackTimer = window.setTimeout(selectNearestAfterMove, mapOptions.animate ? 500 : 0);
    }
  }

  // Classic map actions (such as the current-location button) can use the
  // same visual focus point as the discovery UI.
  window.setMapViewAtDiscoveryFocus = setMapViewAtFocus;

  function sortRailShops(list, sortMode = state.sort) {
    const center = getMapFocusLatLng();
    const searchMode = state.searchResultMode;
    if (searchMode?.active) sortMode = searchMode.sort === 'distance' ? 'center' : 'name';
    const distanceFrom = sortMode === 'current' && userLocation ? userLocation : center;
    const withDistance = list.map(shop => ({
      shop,
      distance: calculateDistance(distanceFrom.lat, distanceFrom.lng, Number(shop.lat), Number(shop.lng))
    }));
    withDistance.sort((a, b) => {
      if (sortMode === 'name') {
        if (IS_JIRO_ONLY_MODE) {
          const categories = ['二郎', '富士丸系', '二郎出身', 'インスパイア', '資本系', '不明'];
          const categoryDiff = categories.indexOf(a.shop.category) - categories.indexOf(b.shop.category);
          if (categoryDiff) return categoryDiff;
        }
        const aName = a.shop.nameHiragana || a.shop.name || '';
        const bName = b.shop.nameHiragana || b.shop.name || '';
        return String(aName).localeCompare(String(bName), 'ja');
      }
      if (sortMode === 'open') {
        const rank = status => status === 'open' ? 0 : status === 'soon' ? 1 : 2;
        const statusDiff = rank(getOpenStatus(a.shop.openingHours).state) - rank(getOpenStatus(b.shop.openingHours).state);
        if (statusDiff) return statusDiff;
      }
      return a.distance - b.distance;
    });
    return withDistance;
  }

  function renderRail(options = {}) {
    const rail = document.getElementById('map-a-card-rail');
    if (!rail || !map) return;
    const renderToken = state.railRenderToken = (state.railRenderToken || 0) + 1;
    if (state.sort === 'current' && !userLocation) state.sort = 'center';
    const allSorted = sortRailShops(getFilteredShops());
    state.totalShopCount = allSorted.length;
    let sorted = state.searchResultMode?.active ? allSorted : allSorted.slice(0, MAX_RAIL_SHOPS);

    if (state.forceShopId && !sorted.some(item => String(item.shop.id) === String(state.forceShopId))) {
      const forced = findShop(state.forceShopId);
      if (forced && Number.isFinite(Number(forced.lat)) && Number.isFinite(Number(forced.lng))) {
        const center = getMapFocusLatLng();
        sorted.unshift({
          shop: forced,
          distance: calculateDistance(center.lat, center.lng, Number(forced.lat), Number(forced.lng))
        });
      }
    }

    state.visibleShops = sorted;
    let selectedNearestJiroShop = false;
    if (options.selectFirst || !sorted.some(item => String(item.shop.id) === String(state.activeShopId))) {
      if (IS_JIRO_ONLY_MODE && state.sort === 'name' && sorted.length) {
        const nearest = sorted.reduce((best, item) => item.distance < best.distance ? item : best, sorted[0]);
        state.activeShopId = nearest.shop.id;
        selectedNearestJiroShop = true;
      } else {
        state.activeShopId = sorted[0]?.shop.id || null;
      }
    }
    if (options.scrollToShopId) state.activeShopId = options.scrollToShopId;

    rail.innerHTML = sorted.length
      ? sorted.map((item, index) => renderRailCard(item, index)).join('')
      : '<div class="map-a-empty-card">条件に合うお店がありません</div>';

    updateRailHeader();
    syncMapSelection();
    void hydrateRailCardPhotos(sorted.map(item => item.shop.id));

    requestAnimationFrame(() => {
      if (renderToken !== state.railRenderToken) return;
      if (selectedNearestJiroShop) {
        scrollRailToShop(state.activeShopId, false, false);
      } else if (options.resetScroll || options.selectFirst) {
        rail.scrollTo({ left: 0, behavior: 'auto' });
      } else if (options.scrollToShopId) {
        scrollRailToShop(options.scrollToShopId, true, false);
      }
    });
  }

  function renderRailCard(item, index) {
    const shop = item.shop;
    const status = getOpenStatus(shop.openingHours);
    const hasOpeningHours = !!shop.openingHours;
    const hasScheduledTime = advancedFilterSettings.day !== '' && advancedFilterSettings.time !== '';
    const statusState = hasScheduledTime ? 'open' : status.state;
    const statusLabel = hasScheduledTime
      ? '営業予定'
      : !hasOpeningHours ? (shop.closed ? '閉店' : '営業時間不明')
      : status.state === 'open' ? '営業中' : status.state === 'soon' ? '閉店間近' : '時間外';
    const origin = getOriginShop(shop);
    const xURL = typeof getShopXURL === 'function' ? getShopXURL(shop) : String(shop.xURL || '');
    const googleURL = String(shop.googleMapUrl || '');
    const active = String(shop.id) === String(state.activeShopId);
    const color = typeof getMapCategoryColor === 'function' ? getMapCategoryColor(shop.category, shop.sourceType) : '#64748b';
    const photoURLs = getCachedRailCardPhotos(shop.id);
    const todayHours = typeof getTodayHours === 'function' ? getTodayHours(shop.openingHours) : '';
    const cardHours = hasScheduledTime
      ? getScheduledDayHours(shop.openingHours, advancedFilterSettings.day)
      : todayHours && todayHours !== '営業時間情報なし' ? `本日 ${todayHours}` : '';
    const originLabel = origin
      ? (getShopMapLabel(origin) || String(origin.name || '').replace(/[\s　]+(?:本店|総本店)$/u, ''))
      : '';
    return `
      <article class="map-a-card${active ? ' is-active' : ''}" style="--map-a-card-color:${escapeAttribute(color)}" data-shop-id="${escapeAttribute(shop.id)}" data-rail-index="${index}" aria-label="${escapeAttribute(shop.name)}" aria-current="${active ? 'true' : 'false'}">
        <button class="map-a-card-title-row" type="button" data-card-action="focus" aria-label="${escapeAttribute(shop.name)}を選択">
          <span class="map-a-card-name">${escapeText(shop.name)}</span>
          <span class="map-a-card-distance">${formatDistance(item.distance)}</span>
        </button>
        <div class="map-a-card-meta">
          <span class="map-a-chip is-category">${escapeText(getShortCategoryName(shop.category, shop.sourceType))}</span>
          ${origin ? `<button class="map-a-chip is-origin" type="button" data-card-action="origin" data-origin-id="${escapeAttribute(origin.id)}" aria-label="出身店 ${escapeAttribute(originLabel)}を家系図で表示">${escapeText(originLabel)}</button>` : ''}
          <span class="map-a-card-area-inline">${icons.pin}<span>${escapeText(shop.area || 'エリア情報なし')}</span></span>
          <span class="map-a-chip is-status is-${statusState}">${statusLabel}</span>
        </div>
        ${cardHours ? `<span class="map-a-card-hours" title="${escapeAttribute(cardHours)}">${escapeText(cardHours)}</span>` : ''}
        <div class="map-a-card-bottom">
          <button class="map-a-card-photo-slot${photoURLs.length ? ' has-photo' : ''}${photoURLs.length > 1 ? ' has-multiple' : ''}" type="button" data-card-action="photo" data-card-photo-slot aria-label="${escapeAttribute(shop.name)}の投稿写真${photoURLs.length ? `${photoURLs.length}枚` : ''}を詳細で見る" aria-hidden="${photoURLs.length ? 'false' : 'true'}" tabindex="${photoURLs.length ? '0' : '-1'}">${renderRailCardPhotoPreview(photoURLs)}</button>
          <span class="map-a-card-bottom-spacer"></span>
          ${xURL ? `<a class="map-a-card-action" href="${escapeAttribute(xURL)}" target="_blank" rel="noopener noreferrer" data-card-action="x" aria-label="公式Xを開く">${icons.xmark}</a>` : ''}
          <button class="map-a-card-action is-detail" type="button" data-card-action="detail">詳細</button>
          ${googleURL ? `<a class="map-a-card-action" href="${escapeAttribute(googleURL)}" target="_blank" rel="noopener noreferrer" data-card-action="map" aria-label="Googleマップで開く">${icons.map}</a>` : ''}
        </div>
      </article>`;
  }

  function getScheduledDayHours(openingHours, selectedDay) {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayIndex = Number(selectedDay);
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) return '';
    const dayLabel = `${dayNames[dayIndex]}曜`;
    if (!openingHours) return `${dayLabel} 営業時間情報なし`;
    const times = openingHours[dayKeys[dayIndex]]?.times;
    if (!Array.isArray(times) || times.length === 0) return `${dayLabel} 定休日`;
    if (times.length === 1 && times[0]?.start === '00:00' && times[0]?.end === '24:00') {
      return `${dayLabel} 24時間営業`;
    }
    const ranges = times
      .filter(time => time?.start && time?.end)
      .map(time => `${time.start}–${time.end}`);
    return ranges.length ? `${dayLabel} ${ranges.join('、')}` : `${dayLabel} 営業時間情報なし`;
  }

  function normalizeRailCardPhoto(value) {
    const photo = String(value || '').trim();
    return /^(?:https?:\/\/|data:image\/)/i.test(photo) ? photo : '';
  }

  function getRailCardPhotoIdentity(photo) {
    if (!/^https?:\/\//i.test(photo)) return photo;
    try {
      const parsed = new URL(photo);
      let pathname = parsed.pathname;
      try { pathname = decodeURIComponent(pathname); } catch (_) {}
      // ローカル復元側の ?v=... と公開投稿側のURLは、同じ保存画像でも
      // 文字列が異なる。同じStorage内パスなら1枚として扱う。
      // 親フォルダは残し、別投稿の「0.jpg」同士はまとめない。
      const bucketMarker = '/visit-photos/';
      const markerIndex = pathname.indexOf(bucketMarker);
      return markerIndex >= 0
        ? `visit-photo:${pathname.slice(markerIndex + bucketMarker.length)}`
        : `url:${parsed.origin}${pathname}`;
    } catch (_) {
      return `url:${photo.split(/[?#]/, 1)[0]}`;
    }
  }

  function normalizeRailCardPhotos(values) {
    const photos = [];
    const seen = new Set();
    (Array.isArray(values) ? values.flat(Infinity) : [values]).forEach(value => {
      const photo = normalizeRailCardPhoto(value);
      if (!photo) return;
      const identity = getRailCardPhotoIdentity(photo);
      if (seen.has(identity)) return;
      seen.add(identity);
      photos.push(photo);
    });
    return photos;
  }

  function mergeRailCardPhotos(...groups) {
    return normalizeRailCardPhotos(groups);
  }

  function renderRailCardPhotoPreview(values) {
    const photos = normalizeRailCardPhotos(values);
    return photos.slice(0, 2).map(photo => `
      <span class="map-a-card-photo-preview">
        <img src="${escapeAttribute(photo)}" loading="lazy" alt="" data-card-photo-url="${escapeAttribute(photo)}">
      </span>`).join('');
  }

  function getLatestLocalPhotoReferences(shopId) {
    const logs = visits?.[shopId]?.logs;
    if (!Array.isArray(logs)) return [];
    const references = [];
    for (let index = logs.length - 1; index >= 0; index -= 1) {
      const photos = Array.isArray(logs[index]?.photos) ? logs[index].photos : [];
      photos.forEach(photo => {
        if (photo && !references.includes(photo)) references.push(photo);
      });
    }
    return references;
  }

  function getCachedCommunityPhotos(shopId) {
    if (typeof communityVisitCache === 'undefined' || !communityVisitCache) return [];
    const key = String(shopId);
    const photos = [];
    for (const visit of Object.values(communityVisitCache)) {
      if (String(visit?.shop_id || '') !== key) continue;
      photos.push(...(Array.isArray(visit?.photo_urls) ? visit.photo_urls : []));
      if (visit?.photo_url) photos.push(visit.photo_url);
    }
    return normalizeRailCardPhotos(photos);
  }

  function getCachedRailCardPhotos(shopId) {
    const key = String(shopId);
    if (state.cardPhotos.has(key)) return normalizeRailCardPhotos(state.cardPhotos.get(key));
    // 「投稿写真」は公開済みのクラウド写真のみ。端末内の写真は混ぜない。
    const photos = getCachedCommunityPhotos(key);
    if (photos.length) state.cardPhotos.set(key, photos);
    return photos;
  }

  function applyRailCardPhotos(shopId, values) {
    const key = String(shopId);
    const photos = normalizeRailCardPhotos(values);
    state.cardPhotos.set(key, photos);
    const rail = document.getElementById('map-a-card-rail');
    const card = rail && Array.from(rail.querySelectorAll('.map-a-card')).find(item => String(item.dataset.shopId) === key);
    const slot = card?.querySelector('[data-card-photo-slot]');
    if (!slot) return;
    slot.innerHTML = renderRailCardPhotoPreview(photos);
    slot.classList.toggle('has-photo', photos.length > 0);
    slot.classList.toggle('has-multiple', photos.length > 1);
    slot.setAttribute('aria-hidden', photos.length ? 'false' : 'true');
    slot.setAttribute('aria-label', `${findShop(key)?.name || '店舗'}の投稿写真${photos.length ? `${photos.length}枚` : ''}を詳細で見る`);
    slot.tabIndex = photos.length ? 0 : -1;
    slot.querySelectorAll('img[data-card-photo-url]').forEach(image => {
      image.addEventListener('error', () => {
        const failedURL = image.dataset.cardPhotoUrl || image.currentSrc || image.src;
        applyRailCardPhotos(key, getCachedRailCardPhotos(key).filter(photo => photo !== failedURL));
      }, { once: true });
    });
  }

  async function hydrateRailCardPhotos(shopIds) {
    const pending = [...new Set(shopIds.map(String))].filter(shopId =>
      !state.cardPhotoHydrated.has(shopId) && !state.cardPhotoLoading.has(shopId)
    );
    if (!pending.length) return;
    pending.forEach(shopId => state.cardPhotoLoading.add(shopId));

    try {
      const remoteShopIds = [];
      for (const shopId of pending) {
        let photos = mergeRailCardPhotos(getCachedRailCardPhotos(shopId), getCachedCommunityPhotos(shopId));
        if (photos.length) applyRailCardPhotos(shopId, photos);
        remoteShopIds.push(shopId);
      }

      if (remoteShopIds.length && typeof supabaseClient !== 'undefined' && supabaseClient && typeof fetchPhotoListMapForVisits === 'function') {
        const { data: visitRows, error } = await supabaseClient
          .from('visits')
          .select('id, shop_id, user_id, visited_on, created_at')
          .in('shop_id', remoteShopIds)
          .eq('is_public', true)
          .lte('visited_on', typeof getJstTodayStr === 'function' ? getJstTodayStr() : new Date().toISOString().slice(0, 10))
          .order('visited_on', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(Math.max(120, remoteShopIds.length * 8));
        if (error) throw error;
        const visibleVisits = (visitRows || []).filter(visit =>
          typeof blockedUserIds === 'undefined' || !blockedUserIds?.has?.(visit.user_id)
        );
        const photoMap = await fetchPhotoListMapForVisits(visibleVisits.map(visit => visit.id));
        const photosByShop = new Map();
        visibleVisits.forEach(visit => {
          const key = String(visit.shop_id);
          photosByShop.set(key, mergeRailCardPhotos(photosByShop.get(key), photoMap.get(visit.id)));
        });
        remoteShopIds.forEach(shopId => {
          const photos = mergeRailCardPhotos(getCachedRailCardPhotos(shopId), photosByShop.get(shopId));
          if (photos.length) applyRailCardPhotos(shopId, photos);
        });
      }

      pending.forEach(shopId => {
        if (!state.cardPhotos.has(shopId)) state.cardPhotos.set(shopId, []);
      });
    } catch (error) {
      console.warn('カード写真を取得できませんでした:', error);
    } finally {
      pending.forEach(shopId => {
        state.cardPhotoLoading.delete(shopId);
        state.cardPhotoHydrated.add(shopId);
      });
    }
  }

  async function hydrateDetailShopPhotos(shopId) {
    const key = String(shopId);
    if (state.detailPhotoHydrated.has(key)) return normalizeRailCardPhotos(state.detailPhotos.get(key));
    if (state.detailPhotoLoading.has(key)) return state.detailPhotoLoading.get(key);

    const request = (async () => {
      let photos = getCachedCommunityPhotos(key);

      if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof fetchPhotoListMapForVisits === 'function') {
        const { data: visitRows, error } = await supabaseClient
          .from('visits')
          .select('id, shop_id, user_id, visited_on, created_at')
          .eq('shop_id', key)
          .eq('is_public', true)
          .lte('visited_on', typeof getJstTodayStr === 'function' ? getJstTodayStr() : new Date().toISOString().slice(0, 10))
          .order('visited_on', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const visibleVisits = (visitRows || []).filter(visit =>
          typeof blockedUserIds === 'undefined' || !blockedUserIds?.has?.(visit.user_id)
        );
        const photoMap = await fetchPhotoListMapForVisits(visibleVisits.map(visit => visit.id));
        let remotePhotos = [];
        visibleVisits.forEach(visit => {
          remotePhotos = mergeRailCardPhotos(remotePhotos, photoMap.get(visit.id));
        });
        photos = mergeRailCardPhotos(remotePhotos, photos);
      }

      state.detailPhotos.set(key, photos);
      state.detailPhotoHydrated.add(key);
      return photos;
    })().catch(error => {
      console.warn('詳細写真を取得できませんでした:', error);
      return getCachedRailCardPhotos(key);
    }).finally(() => {
      state.detailPhotoLoading.delete(key);
    });

    state.detailPhotoLoading.set(key, request);
    return request;
  }

  function updateDetailPhotoGallery(shopId, values) {
    const key = String(shopId);
    const section = document.getElementById('detail-photo-section');
    const gallery = document.getElementById('detail-photo-gallery');
    const count = document.getElementById('detail-photo-count');
    const syncStatus = document.getElementById('detail-photo-sync-status');
    if (!section || !gallery || !count || section.dataset.shopId !== key) return;
    const photos = normalizeRailCardPhotos(values);
    const pendingPhotoCount = Number(window.getPendingPublicPhotoCount?.(key) || 0);
    section.hidden = photos.length === 0 && pendingPhotoCount === 0;
    count.textContent = photos.length ? `${photos.length}枚` : '';
    gallery.hidden = photos.length === 0;
    if (syncStatus) {
      syncStatus.hidden = pendingPhotoCount === 0;
      syncStatus.innerHTML = pendingPhotoCount > 0
        ? `写真をアップロード中です… <button type="button" data-retry-photo-sync>今すぐ再試行</button>`
        : '';
      syncStatus.querySelector('[data-retry-photo-sync]')?.addEventListener('click', () => window.retryPendingPhotoSync?.());
    }
    gallery.innerHTML = photos.map((photo, index) => `
      <figure class="map-a-detail-photo">
        <img src="${escapeAttribute(photo)}" loading="lazy" alt="${escapeAttribute(findShop(key)?.name || '店舗')}の投稿写真 ${index + 1}枚目">
      </figure>`).join('');
    gallery.querySelectorAll('img').forEach(image => {
      image.addEventListener('error', () => image.closest('.map-a-detail-photo')?.remove(), { once: true });
      image.addEventListener('click', () => window.openPhotoLightbox?.(image.currentSrc || image.src, image.alt));
    });
  }

  async function renderMapDiscoveryDetailPhotos(shopId) {
    const key = String(shopId);
    const section = document.getElementById('detail-photo-section');
    if (!section) return;
    section.dataset.shopId = key;
    updateDetailPhotoGallery(key, normalizeRailCardPhotos(state.detailPhotos.get(key) || getCachedCommunityPhotos(key)));
    const photos = await hydrateDetailShopPhotos(key);
    updateDetailPhotoGallery(key, photos);
  }

  window.renderMapDiscoveryDetailPhotos = renderMapDiscoveryDetailPhotos;

  // 写真同期完了後に公開写真を再取得する。
  window.refreshMapDiscoveryShopPhotos = function refreshMapDiscoveryShopPhotos(shopId) {
    const key = String(shopId || '');
    if (!key) return;
    state.cardPhotos.delete(key);
    state.cardPhotoHydrated.delete(key);
    state.detailPhotos.delete(key);
    state.detailPhotoHydrated.delete(key);
    state.detailPhotoLoading.delete(key);
    void hydrateRailCardPhotos([key]);
    const modal = document.getElementById('shop-detail-modal');
    const section = document.getElementById('detail-photo-section');
    if (modal?.classList.contains('active') && section?.dataset.shopId === key) {
      void renderMapDiscoveryDetailPhotos(key);
    }
  };

  function getOriginShop(shop) {
    if (!shop?.parent) return null;
    const origin = findShop(shop.parent);
    return origin && origin.name !== 'ダミー' ? origin : null;
  }

  function updateRailHeader() {
    const heading = document.getElementById('map-a-rail-heading');
    const position = document.getElementById('map-a-rail-position');
    const labels = {
      center: '地図中心から近い順',
      current: '現在地・指定地点から近い順',
      open: '営業中を優先',
      name: IS_JIRO_ONLY_MODE ? 'カテゴリ・店名順' : '店名 あ→ん'
    };
    if (heading) {
      heading.textContent = state.searchResultMode?.active
        ? `「${state.searchResultMode.query}」の検索結果`
        : state.sort === 'center' ? '中心から近いお店' : labels[state.sort];
    }
    const index = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
    const total = Math.max(state.totalShopCount, state.visibleShops.length);
    if (position) position.textContent = state.visibleShops.length ? `${index + 1} / ${total}` : '0 / 0';
  }

  function beginRailGesture(event) {
    const rail = event.currentTarget;
    // カード内のボタン／リンクはドラッグ対象にせず、それぞれの操作を優先する。
    if (event.target.closest('[data-card-action]')) return;
    const card = event.target.closest('.map-a-card');
    state.railGestureStartIndex = getNearestRailIndex(rail);
    state.railGestureStartShopId = card?.dataset.shopId || null;
    state.railGestureStartX = event.clientX;
    state.railGestureStartScrollLeft = rail.scrollLeft;

    // PCでは、カードを左クリックして左右へドラッグできるようにする。
    if (event.pointerType === 'mouse' && event.button === 0) {
      state.railDragPointerId = event.pointerId;
      rail.classList.add('is-dragging');
      rail.setPointerCapture?.(event.pointerId);
    }
  }

  function moveRailGesture(event) {
    if (state.railDragPointerId !== event.pointerId) return;
    const rail = event.currentTarget;
    const deltaX = event.clientX - state.railGestureStartX;
    // クリック時のわずかな手ぶれはドラッグとして扱わない。
    if (Math.abs(deltaX) <= 6) return;

    event.preventDefault();
    rail.scrollLeft = state.railGestureStartScrollLeft - deltaX;
    state.suppressCardClickUntil = Date.now() + 450;
  }

  function finishRailGesture(event) {
    if (state.railGestureStartIndex === null) return;
    const deltaX = event.clientX - state.railGestureStartX;
    const wasMouseDrag = state.railDragPointerId === event.pointerId;
    const startShopId = state.railGestureStartShopId;
    // releasePointerCapture による lostpointercapture を通常クリックの
    // キャンセルとして扱わないよう、先にジェスチャーを終了させる。
    state.railGestureStartIndex = null;
    state.railGestureStartShopId = null;
    if (wasMouseDrag) {
      clearRailDrag(event.currentTarget, event.pointerId);
    }
    if (Math.abs(deltaX) <= 6) {
      // Pointer Capture 中は click の対象がカード列へ変わることがあるため、
      // カード本体のクリックはここで確実に詳細モーダルまで開く。
      if (startShopId) {
        activateShopFromCard(startShopId);
        if (wasMouseDrag && typeof showShopDetail === 'function') {
          // pointerup 後に発火する同じクリックは二重に処理しない。
          state.suppressCardClickUntil = Date.now() + 450;
          showShopDetail(startShopId);
        }
      }
      return;
    }
    if (Math.abs(deltaX) > 6) state.suppressCardClickUntil = Date.now() + 450;
    if (wasMouseDrag) {
      // ドラッグ後にカード列を強制的に動かし直すと、手を離した位置から
      // 別のカードへ跳んだように見える。現在位置のカードだけを選択する。
      selectRailAt(getNearestRailIndex(event.currentTarget), true);
      return;
    }
    // Native momentum may continue after pointerup. Do not force the rail back
    // to the adjacent card here; scrollend/debounced scroll selects the card
    // where the swipe actually settles.
  }

  function cancelRailGesture(event) {
    const startIndex = state.railGestureStartIndex;
    if (state.railDragPointerId === event.pointerId) {
      clearRailDrag(event.currentTarget, event.pointerId);
    }
    state.railGestureStartIndex = null;
    state.railGestureStartShopId = null;
    if (startIndex === null) return;
    state.suppressCardClickUntil = Date.now() + 450;
  }

  function clearRailDrag(rail, pointerId) {
    state.railDragPointerId = null;
    rail.classList.remove('is-dragging');
    if (rail.hasPointerCapture?.(pointerId)) rail.releasePointerCapture(pointerId);
  }

  function handleRailScroll(event) {
    const rail = event.currentTarget;
    if (state.railDragPointerId !== null) return;
    window.clearTimeout(state.railSettleTimer);
    if (Date.now() < state.suppressRailUntil) return;
    state.railSettleTimer = window.setTimeout(() => {
      // Some Android webviews cancel or retarget pointerup during native scrolling.
      // Use the settled scroll position as the source of truth in that case.
      if (state.railGestureStartIndex !== null) {
        state.railGestureStartIndex = null;
        state.suppressCardClickUntil = Date.now() + 300;
      }
      const nearest = getNearestRailIndex(rail);
      selectRailAt(nearest, true);
    }, 180);
  }

  function handleRailScrollEnd(event) {
    const rail = event.currentTarget;
    const activeIndex = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
    const nearest = getNearestRailIndex(rail);
    if (nearest === activeIndex) return;
    state.railGestureStartIndex = null;
    state.suppressCardClickUntil = Date.now() + 300;
    selectRailAt(nearest, true);
  }

  function getNearestRailIndex(rail) {
    const cards = Array.from(rail.querySelectorAll('.map-a-card'));
    if (!cards.length) return 0;
    const targetLeft = rail.scrollLeft + 14;
    let bestIndex = 0;
    let bestDistance = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - targetLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function settleRailAt(index, smooth, fromUser) {
    const rail = document.getElementById('map-a-card-rail');
    const cards = rail ? Array.from(rail.querySelectorAll('.map-a-card')) : [];
    const card = cards[index];
    const item = state.visibleShops[index];
    if (!rail || !card || !item) return;
    state.suppressRailUntil = Date.now() + 430;
    rail.scrollTo({ left: Math.max(0, card.offsetLeft - 14), behavior: smooth ? 'smooth' : 'auto' });
    selectRailAt(index, fromUser, smooth ? 240 : 0);
  }

  function selectRailAt(index, fromUser, delay = 0) {
    const item = state.visibleShops[index];
    if (!item) return;
    window.clearTimeout(state.railSettleTimer);
    state.railSettleTimer = window.setTimeout(() => {
      selectMapShop(item.shop.id);
      updateRailCardSelection();
      if (fromUser) maybeZoomOutForCard(item.shop);
    }, delay);
  }

  function handleRailClick(event) {
    const action = event.target.closest('[data-card-action]');
    const card = event.target.closest('.map-a-card');
    if (!card) return;
    const shopId = card.dataset.shopId;
    if (action) {
      if (Date.now() < state.suppressCardClickUntil) {
        event.preventDefault();
        return;
      }
      event.stopPropagation();
      const type = action.dataset.cardAction;
      if (type === 'focus') {
        event.preventDefault();
        activateShopFromCard(shopId);
        if (typeof showShopDetail === 'function') showShopDetail(shopId);
      } else if (type === 'origin') {
        event.preventDefault();
        if (typeof jumpToLineageTabAndSelect === 'function') jumpToLineageTabAndSelect(action.dataset.originId);
      } else if (type === 'photo') {
        if (typeof showShopDetail === 'function') showShopDetail(shopId);
      } else if (type === 'detail') {
        if (typeof navigateToPublicShop === 'function') navigateToPublicShop(shopId);
      }
      return;
    }
    if (Date.now() < state.suppressCardClickUntil) return;
    activateShopFromCard(shopId);
    if (typeof showShopDetail === 'function') showShopDetail(shopId);
  }

  function activateShopFromCard(shopId) {
    const shop = findShop(shopId);
    if (!shop) return;
    selectMapShop(shop.id);
    updateRailCardSelection();
  }

  function selectMapShop(shopId) {
    state.activeShopId = shopId;
    if (typeof selectMapMarker === 'function' && markers?.[shopId]) selectMapMarker(shopId);
    syncSelectedShopIndicator(shopId);
    updateRailHeader();
  }

  function syncMapSelection() {
    if (state.activeShopId && markers?.[state.activeShopId] && typeof selectMapMarker === 'function') {
      selectMapMarker(state.activeShopId);
    }
    syncSelectedShopIndicator(state.activeShopId);
  }

  function syncSelectedShopIndicator(shopId) {
    if (!isMapUiA() || !map || typeof L === 'undefined') {
      if (selectedShopIndicator) {
        selectedShopIndicator.remove();
        selectedShopIndicator = null;
      }
      return;
    }
    const shop = findShop(shopId);
    if (!shop || !Number.isFinite(Number(shop.lat)) || !Number.isFinite(Number(shop.lng))) return;
    ensureMapShopLabelPane();
    const position = [Number(shop.lat), Number(shop.lng)];
    const categoryColor = getMapLayerMarkerColor(shop);
    if (!selectedShopIndicator) {
      selectedShopIndicator = L.circleMarker(position, {
        radius: 13,
        color: '#25211f',
        weight: 4,
        opacity: 1,
        fillColor: categoryColor,
        fillOpacity: 1,
        interactive: false,
        bubblingMouseEvents: false,
        pane: 'mapSelectedShopMarkerPane',
        className: 'map-a-selected-pin-indicator'
      }).addTo(map);
      syncMapShopLabels();
      return;
    }
    selectedShopIndicator.setLatLng(position);
    selectedShopIndicator.setStyle({ fillColor: categoryColor });
    selectedShopIndicator.bringToFront();
    syncMapShopLabels();
  }

  function updateRailCardSelection() {
    document.querySelectorAll('#map-a-card-rail .map-a-card').forEach(card => {
      const active = String(card.dataset.shopId) === String(state.activeShopId);
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-current', String(active));
    });
    updateRailHeader();
  }

  function scrollRailToShop(shopId, smooth = true, applyMapBehavior = false) {
    const index = state.visibleShops.findIndex(item => String(item.shop.id) === String(shopId));
    if (index < 0) return;
    settleRailAt(index, smooth, applyMapBehavior);
  }

  function maybeZoomOutForCard(shop) {
    if (!map || state.cardMapBehavior !== 'zoomout' || isShopInSafeArea(shop)) return;
    const currentZoom = map.getZoom();
    let targetZoom = currentZoom;
    for (let step = 1; step <= CARD_ZOOM_OUT_MAX_STEPS; step += 1) {
      const candidateZoom = currentZoom - step;
      if (candidateZoom < CARD_ZOOM_OUT_MIN_ZOOM) break;
      targetZoom = candidateZoom;
      if (isShopInSafeArea(shop, candidateZoom)) {
        break;
      }
    }
    if (targetZoom >= currentZoom) return;
    markProgrammaticMapMove('rail-zoomout');
    map.setZoom(targetZoom, { animate: true });
  }

  function getSafeAreaPadding() {
    const mapSize = map?.getSize?.() || { x: 390, y: 600 };
    const root = document.getElementById('map-a-root');
    const cardRegion = root?.querySelector('.map-a-card-region');
    const dock = root?.querySelector('.map-a-command-dock');
    const covered = Math.max(190, (cardRegion?.offsetHeight || 148) + (dock?.offsetHeight || 52) + 22);
    return {
      topLeft: L.point(26, 26),
      bottomRight: L.point(26, Math.min(mapSize.y - 40, covered))
    };
  }

  function isShopInSafeArea(shop, zoom = map?.getZoom?.()) {
    if (!map || !shop || !Number.isFinite(Number(shop.lat)) || !Number.isFinite(Number(shop.lng))) return false;
    const size = map.getSize();
    const centerPixel = map.project(map.getCenter(), zoom);
    const shopPixel = map.project([Number(shop.lat), Number(shop.lng)], zoom);
    const point = shopPixel.subtract(centerPixel).add(size.divideBy(2));
    const padding = getSafeAreaPadding();
    return point.x >= padding.topLeft.x && point.x <= size.x - padding.bottomRight.x &&
      point.y >= padding.topLeft.y && point.y <= size.y - padding.bottomRight.y;
  }

  function panShopIntoSafeArea(shop, animate) {
    if (!map || !shop) return;
    const padding = getSafeAreaPadding();
    map.panInside([Number(shop.lat), Number(shop.lng)], {
      paddingTopLeft: padding.topLeft,
      paddingBottomRight: padding.bottomRight,
      animate
    });
  }

  function markProgrammaticMapMove(source) {
    state.programmaticMapMove = source;
    window.clearTimeout(state.programmaticClearTimer);
    // Leaflet does not emit moveend when the requested camera is already equal.
    state.programmaticClearTimer = window.setTimeout(() => {
      state.programmaticMapMove = '';
    }, 800);
  }

  function openAdjustPanel() {
    closeSearchSurface();
    syncAdjustControls();
    switchAdjustTab(state.searchResultMode?.active ? 'sort' : state.adjustTab);
    document.getElementById('map-a-adjust-panel')?.classList.add('is-open');
    document.getElementById('map-a-adjust-panel')?.setAttribute('aria-hidden', 'false');
    document.getElementById('map-a-scrim')?.classList.add('is-open');
    document.getElementById('map-a-adjust-trigger')?.setAttribute('aria-expanded', 'true');
  }

  function closeAdjustPanel(options = {}) {
    const panel = document.getElementById('map-a-adjust-panel');
    if (options.force !== true && panel?.classList.contains('is-open') && advancedFilterSettings?.noCategories) {
      if (typeof showToast === 'function') showToast('系統を1つ選択してください。');
      else window.alert('系統を1つ選択してください。');
      return false;
    }
    panel?.classList.remove('is-open');
    panel?.setAttribute('aria-hidden', 'true');
    document.getElementById('map-a-scrim')?.classList.remove('is-open');
    document.getElementById('map-a-adjust-trigger')?.setAttribute('aria-expanded', 'false');
    return true;
  }

  function switchAdjustTab(tab) {
    const nextTab = ['filter', 'sort', 'settings'].includes(tab) ? tab : 'filter';
    state.adjustTab = nextTab;
    document.querySelectorAll('[data-map-a-adjust-tab]').forEach(button => {
      const active = button.dataset.mapAAdjustTab === nextTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-map-a-adjust-pane]').forEach(pane => {
      const active = pane.dataset.mapAAdjustPane === nextTab;
      pane.classList.toggle('is-active', active);
      pane.hidden = !active;
    });
    const subtitles = {
      filter: '表示する店舗を選ぶ',
      sort: 'カードの並び順を選ぶ',
      settings: 'マップに表示する系統の初期状態を選ぶ'
    };
    const subtitle = document.getElementById('map-a-adjust-subtitle');
    if (subtitle) subtitle.textContent = subtitles[nextTab];
    const applyButton = document.getElementById('map-a-apply');
    if (applyButton) {
      applyButton.innerHTML = nextTab === 'filter'
        ? `完了・<span id="map-a-draft-count">${getFilteredShops().length}</span>店表示中`
        : nextTab === 'settings' ? '自動保存済み・完了' : '完了';
    }
    syncAdjustCompletionState();
  }

  function handleAdjustInputChange(event) {
    if (state.searchResultMode?.active) {
      if (event.target?.name === 'map-a-sort') {
        const selectedSort = event.target.value;
        state.searchResultMode.sort = selectedSort === 'name' ? 'name' : 'distance';
        state.shopSearchSort = state.searchResultMode.sort;
        syncSearchResultModeControls();
        renderRail({ preserveActive: true });
      }
      return;
    }
    if (event.target?.id === 'map-a-filter-unvisited' && event.target.checked) setChecked('map-a-filter-visited', false);
    if (event.target?.id === 'map-a-filter-visited' && event.target.checked) setChecked('map-a-filter-unvisited', false);
    if (event.target?.id === 'map-a-filter-day' || event.target?.id === 'map-a-filter-time') {
      const day = document.getElementById('map-a-filter-day')?.value || '';
      const time = document.getElementById('map-a-filter-time')?.value || '';
      // 指定日時検索と「現在時刻で営業中」は排他的。
      // 曜日または時刻を入力した時点で現在時刻フィルターを解除し、
      // もう片方を選んだ時に指定日時検索がそのまま有効になるようにする。
      if (day !== '' || time !== '') setChecked('map-a-filter-open', false);
    }
    const preserveActive = event.target?.name === 'map-a-card-map';
    applyAdjustDraft({ closePanel: false, preserveActive });
  }

  function handleAdjustCategoryClick(event) {
    const button = event.currentTarget;
    if (!button) return;
    const selected = getEffectiveAdjustCategorySelection();
    const group = button.dataset.mapACategoryGroup;
    if (group) {
      const groupValues = getAdjustCategoryOptions(group).map(option => option.value);
      const groupIsSelected = groupValues.length > 0 && groupValues.every(value => selected.has(value));
      if (groupIsSelected) selected.clear();
      else groupValues.forEach(value => selected.add(value));
    } else {
      const value = button.dataset.mapACategory;
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
    }
    storeAdjustCategorySelection(selected);
    syncAdjustCategoryControls();
    applyAdjustDraft({ closePanel: false });
  }

  function handleLegendCategoryClick(event) {
    const button = event.target.closest('[data-map-a-legend-category]');
    if (!button) return;
    const value = button.dataset.mapALegendCategory;
    const selected = getEffectiveAdjustCategorySelection();
    if (selected.has(value)) {
      // An empty array means "all categories" in the legacy filter, so retain
      // the last category instead of unexpectedly restoring every category.
      if (selected.size <= 1) return;
      selected.delete(value);
    } else {
      selected.add(value);
    }
    storeAdjustCategorySelection(selected);
    // The legend lives outside the adjust panel. Refresh every panel control
    // from the committed state before applying the category change so a stale
    // checkbox cannot overwrite filters changed from the map controls.
    syncAdjustControls();
    applyAdjustDraft({ closePanel: false });
  }

  function getEffectiveDefaultCategorySelection() {
    const stored = Array.isArray(state.defaultCategories) ? state.defaultCategories : [];
    return new Set(stored.length ? stored : getAllAdjustCategoryValues());
  }

  function storeDefaultCategorySelection(selected) {
    const allValues = getAllAdjustCategoryValues();
    state.defaultCategories = allValues.length > 0 && allValues.every(value => selected.has(value))
      ? []
      : allValues.filter(value => selected.has(value));
    if (IS_JIRO_ONLY_MODE) {
      try {
        localStorage.setItem(JIRO_DEFAULT_CATEGORIES_KEY, JSON.stringify(state.defaultCategories));
      } catch (_) {}
    } else {
      state.defaultCategories = window.saveDefaultFilterCategories?.(state.defaultCategories) ?? state.defaultCategories;
    }
  }

  function handleDefaultCategoryClick(event) {
    const button = event.currentTarget;
    if (!button) return;
    const selected = getEffectiveDefaultCategorySelection();
    const group = button.dataset.mapADefaultCategoryGroup;
    if (group) {
      const groupValues = getAdjustCategoryOptions(group).map(option => option.value);
      const groupIsSelected = groupValues.length > 0 && groupValues.every(value => selected.has(value));
      groupValues.forEach(value => {
        if (groupIsSelected) selected.delete(value);
        else selected.add(value);
      });
    } else {
      const value = button.dataset.mapADefaultCategory;
      if (selected.has(value)) {
        if (selected.size <= 1) return;
        selected.delete(value);
      } else {
        selected.add(value);
      }
    }
    storeDefaultCategorySelection(selected);
    syncDefaultCategoryControls();
  }

  function syncAdjustControls() {
    const selectedSort = state.searchResultMode?.active
      ? (state.searchResultMode.sort === 'name' ? 'name' : 'center')
      : state.sort;
    const sortInput = document.querySelector(`input[name="map-a-sort"][value="${selectedSort}"]`);
    if (sortInput) sortInput.checked = true;
    const behaviorInput = document.querySelector(`input[name="map-a-card-map"][value="${state.cardMapBehavior}"]`);
    if (behaviorInput) behaviorInput.checked = true;
    const currentRadio = document.querySelector('input[name="map-a-sort"][value="current"]');
    if (currentRadio) currentRadio.disabled = !userLocation;
    setChecked('map-a-filter-open', !!showOpenOnly);
    setChecked('map-a-filter-want', !!advancedFilterSettings?.wantToGo);
    setChecked('map-a-filter-favorite', !!advancedFilterSettings?.favorite);
    setChecked('map-a-filter-new', !!advancedFilterSettings?.newShop);
    setChecked('map-a-filter-unvisited', !!advancedFilterSettings?.unvisited);
    setChecked('map-a-filter-visited', !!advancedFilterSettings?.visited);
    const dayControl = document.getElementById('map-a-filter-day');
    const timeControl = document.getElementById('map-a-filter-time');
    if (dayControl) dayControl.value = String(advancedFilterSettings?.day ?? '');
    if (timeControl) timeControl.value = String(advancedFilterSettings?.time ?? '');
    syncAdjustCategoryControls();
    syncDefaultCategoryControls();
    updateDraftCount();
    syncAdjustCompletionState();
  }

  function syncDefaultCategoryControls() {
    const selected = getEffectiveDefaultCategorySelection();
    document.querySelectorAll('[data-map-a-default-category]').forEach(button => {
      const active = selected.has(button.dataset.mapADefaultCategory);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-map-a-default-category-group]').forEach(button => {
      const values = getAdjustCategoryOptions(button.dataset.mapADefaultCategoryGroup).map(option => option.value);
      const active = values.length > 0 && values.every(value => selected.has(value));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function syncAdjustCategoryControls() {
    const selected = getEffectiveAdjustCategorySelection();
    document.querySelectorAll('[data-map-a-category]').forEach(button => {
      const active = selected.has(button.dataset.mapACategory);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const groupStates = {};
    document.querySelectorAll('[data-map-a-category-group]').forEach(button => {
      const group = button.dataset.mapACategoryGroup;
      const values = getAdjustCategoryOptions(group).map(option => option.value);
      const active = values.length > 0 && values.every(value => selected.has(value));
      groupStates[group] = active;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const summary = document.getElementById('map-a-category-summary');
    if (summary) {
      if (IS_JIRO_ONLY_MODE && groupStates.iekei) summary.textContent = '二郎系';
      else if (IS_MIXED_MODE && groupStates.iekei && groupStates.isse && groupStates.jiro) summary.textContent = '家系・二郎系';
      else if (groupStates.iekei && groupStates.isse) summary.textContent = '家系・壱系';
      else if (groupStates.iekei) summary.textContent = '家系';
      else if (groupStates.isse) summary.textContent = '壱系';
      else summary.textContent = `${selected.size}系統`;
    }
  }

  function syncAdjustCompletionState() {
    const categoryMissing = !!advancedFilterSettings?.noCategories;
    const applyButton = document.getElementById('map-a-apply');
    if (applyButton) {
      applyButton.disabled = categoryMissing;
      applyButton.setAttribute('aria-disabled', String(categoryMissing));
    }
  }

  function resetAdjustDraft() {
    const activeTab = state.adjustTab;
    if (activeTab === 'filter') {
      setChecked('map-a-filter-open', true);
      setChecked('map-a-filter-want', false);
      setChecked('map-a-filter-favorite', false);
      setChecked('map-a-filter-new', false);
      setChecked('map-a-filter-unvisited', false);
      setChecked('map-a-filter-visited', false);
      showOpenOnly = true;
      advancedFilterSettings.categories = readDefaultFilterCategories();
      advancedFilterSettings.wantToGo = false;
      advancedFilterSettings.favorite = false;
      advancedFilterSettings.newShop = false;
      advancedFilterSettings.noCategories = false;
      advancedFilterSettings.unvisited = false;
      advancedFilterSettings.visited = false;
      advancedFilterSettings.day = '';
      advancedFilterSettings.time = '';
      if (document.getElementById('map-a-filter-day')) document.getElementById('map-a-filter-day').value = '';
      if (document.getElementById('map-a-filter-time')) document.getElementById('map-a-filter-time').value = '';
      if (document.getElementById('filter-day')) document.getElementById('filter-day').value = '';
      if (document.getElementById('filter-time')) document.getElementById('filter-time').value = '';
      syncAdjustCategoryControls();
      clearClassicSearchFilter();
    } else if (activeTab === 'sort') {
      setRadio('map-a-sort', 'center');
      state.sort = 'center';
    } else {
      setRadio('map-a-card-map', 'zoomout');
      state.cardMapBehavior = 'zoomout';
      state.defaultCategories = window.getFactoryDefaultFilterCategories?.()
        ?? getAdjustCategoryOptions('iekei').map(option => option.value);
      state.defaultCategories = window.saveDefaultFilterCategories?.(state.defaultCategories) ?? state.defaultCategories;
      syncDefaultCategoryControls();
    }
    try {
      localStorage.setItem(SORT_KEY, state.sort);
      localStorage.setItem(CARD_MAP_BEHAVIOR_KEY, state.cardMapBehavior);
    } catch (_) {}
    if (activeTab === 'settings') {
      syncAllControls();
      updateDraftCount();
      return;
    }
    releaseForcedShopMarker();
    if (typeof updateFilterSummary === 'function') updateFilterSummary();
    if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    syncLegacyFilterControls();
    renderShopList();
    updateMarkers();
    renderRail({ selectFirst: true, resetScroll: true });
    syncAllControls();
    updateDraftCount();
  }

  function applyAdjustDraft(options = {}) {
    state.sort = getRadioValue('map-a-sort', 'center');
    state.cardMapBehavior = getRadioValue('map-a-card-map', 'zoomout');
    showOpenOnly = !!document.getElementById('map-a-filter-open')?.checked;
    advancedFilterSettings.day = document.getElementById('map-a-filter-day')?.value ?? advancedFilterSettings.day;
    advancedFilterSettings.time = document.getElementById('map-a-filter-time')?.value ?? advancedFilterSettings.time;
    if (showOpenOnly && (advancedFilterSettings.day !== '' || advancedFilterSettings.time !== '')) {
      advancedFilterSettings.day = '';
      advancedFilterSettings.time = '';
      if (document.getElementById('map-a-filter-day')) document.getElementById('map-a-filter-day').value = '';
      if (document.getElementById('map-a-filter-time')) document.getElementById('map-a-filter-time').value = '';
      if (document.getElementById('filter-day')) document.getElementById('filter-day').value = '';
      if (document.getElementById('filter-time')) document.getElementById('filter-time').value = '';
      if (typeof updateFilterSummary === 'function') updateFilterSummary();
      if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    }
    if (document.getElementById('filter-day')) document.getElementById('filter-day').value = advancedFilterSettings.day;
    if (document.getElementById('filter-time')) document.getElementById('filter-time').value = advancedFilterSettings.time;
    advancedFilterSettings.wantToGo = !!document.getElementById('map-a-filter-want')?.checked;
    advancedFilterSettings.favorite = !!document.getElementById('map-a-filter-favorite')?.checked;
    advancedFilterSettings.newShop = !!document.getElementById('map-a-filter-new')?.checked;
    advancedFilterSettings.unvisited = !!document.getElementById('map-a-filter-unvisited')?.checked;
    advancedFilterSettings.visited = !!document.getElementById('map-a-filter-visited')?.checked;
    releaseForcedShopMarker();
    try {
      localStorage.setItem(SORT_KEY, state.sort);
      localStorage.setItem(CARD_MAP_BEHAVIOR_KEY, state.cardMapBehavior);
    } catch (_) {}
    if (typeof updateFilterSummary === 'function') updateFilterSummary();
    if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    syncLegacyFilterControls();
    if (options.closePanel !== false) closeAdjustPanel();
    renderShopList();
    updateMarkers();
    renderRail(options.preserveActive
      ? { preserveActive: true }
      : { selectFirst: true, resetScroll: true });
    syncAllControls();
    updateDraftCount();
  }

  function updateDraftCount() {
    const count = getFilteredShops({
      openOnly: !!document.getElementById('map-a-filter-open')?.checked,
      want: !!document.getElementById('map-a-filter-want')?.checked,
      favorite: !!document.getElementById('map-a-filter-favorite')?.checked,
      newShop: !!document.getElementById('map-a-filter-new')?.checked,
      unvisited: !!document.getElementById('map-a-filter-unvisited')?.checked,
      visited: !!document.getElementById('map-a-filter-visited')?.checked
    }).length;
    const element = document.getElementById('map-a-draft-count');
    if (element) element.textContent = String(count);
    syncAdjustCompletionState();
  }

  function toggleOpenOnlyImmediately() {
    if (state.searchResultMode?.active) {
      state.searchResultMode.openOnly = !state.searchResultMode.openOnly;
      syncOpenToggle();
      updateMarkers();
      renderShopList();
      renderRail({ preserveActive: true });
      return;
    }
    const hasScheduledTime = advancedFilterSettings.day !== '' || advancedFilterSettings.time !== '';
    if (hasScheduledTime) {
      advancedFilterSettings.day = '';
      advancedFilterSettings.time = '';
      if (document.getElementById('filter-day')) document.getElementById('filter-day').value = '';
      if (document.getElementById('filter-time')) document.getElementById('filter-time').value = '';
      showOpenOnly = true;
      if (typeof updateFilterSummary === 'function') updateFilterSummary();
      if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    } else {
      showOpenOnly = !showOpenOnly;
    }
    releaseForcedShopMarker();
    syncLegacyFilterControls();
    renderShopList();
    updateMarkers();
    renderRail({ selectFirst: true, resetScroll: true });
    syncAllControls();
  }

  function syncLegacyFilterControls() {
    ['btn-open-toggle', 'list-btn-open-toggle'].forEach(id => {
      document.getElementById(id)?.classList.toggle('active', !!showOpenOnly);
    });
  }

  function clearClassicSearchFilter() {
    searchQuery = '';
    ['search-input', 'list-search-input'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    ['search-clear', 'list-search-clear'].forEach(id => document.getElementById(id)?.classList.remove('visible'));
    document.getElementById('btn-search-toggle')?.classList.remove('active');
    const searchBox = document.getElementById('map-search-box');
    if (searchBox) searchBox.style.display = 'none';
    document.querySelector('.map-view')?.classList.remove('drawer-search-open');
    window.syncMapDrawerForSearch?.();
  }

  function syncAllControls() {
    syncLegacyFilterControls();
    syncAdjustControls();
    syncOpenToggle();
    syncSearchResultModeControls();
    syncCurrentLocationButton();
    syncFilterLabel();
    syncMapColorLegend();
    syncMapLayerControls();
    syncMapUiSetting();
  }

  function syncMapColorLegend() {
    const legend = document.getElementById('map-a-color-legend');
    const items = document.getElementById('map-a-color-legend-items');
    if (!legend || !items) return;
    if (state.searchResultMode?.active) {
      legend.hidden = true;
      return;
    }
    const selected = getEffectiveAdjustCategorySelection();
    const options = getCategoryGroups()
      .flatMap(group => getAdjustCategoryOptions(group));
    items.innerHTML = options.map(option => {
      const color = state.mapColorMode === 'visit'
        ? '#25211f'
        : getCategoryUiColor(option.value, option.group);
      const shortLabel = typeof getShortCategoryName === 'function' ? getShortCategoryName(option.value) : option.label;
      const label = option.value === '王道家（との丸家）'
        ? 'との丸'
        : option.value === '壱系（資本系）'
          ? '壱系（資本）'
          : shortLabel;
      const active = selected.has(option.value);
      return `<button class="map-a-color-legend-item${active ? ' is-active' : ''}" type="button" data-map-a-legend-category="${escapeMarkup(option.value)}" aria-pressed="${active}" aria-label="${escapeMarkup(label)}を${active ? '非表示' : '表示'}" style="--map-a-legend-color:${escapeMarkup(color)}"><span class="map-a-color-legend-dot" aria-hidden="true"></span>${escapeMarkup(label)}</button>`;
    }).join('');
    legend.hidden = options.length === 0;
    legend.classList.toggle('is-visit-mode', state.mapColorMode === 'visit');
    const visitLegend = document.getElementById('map-a-visit-legend');
    if (visitLegend) visitLegend.hidden = state.mapColorMode !== 'visit';
  }

  function toggleMapLayerPanel(event) {
    event?.stopPropagation();
    const panel = document.getElementById('map-a-layer-panel');
    const button = document.getElementById('map-a-layer-trigger');
    if (!panel || !button) return;
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    button.classList.toggle('is-active', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) closeAdjustPanel();
  }

  function closeMapLayerPanel() {
    const panel = document.getElementById('map-a-layer-panel');
    const button = document.getElementById('map-a-layer-trigger');
    if (panel) panel.hidden = true;
    button?.classList.remove('is-active');
    button?.setAttribute('aria-expanded', 'false');
  }

  function setMapColorMode(mode) {
    if (mode !== 'lineage' && mode !== 'visit') return;
    state.mapColorMode = mode;
    applyMapLayerMarkerStyles();
    syncMapColorLegend();
    syncMapLayerControls();
  }

  function syncMapLayerControls() {
    const root = document.getElementById('map-a-root');
    if (root) root.dataset.mapColorMode = state.mapColorMode;
    const toggle = document.getElementById('map-a-label-toggle');
    if (toggle) toggle.checked = state.mapLabelsVisible;
    document.querySelectorAll('[data-map-a-color-mode]').forEach(button => {
      const active = button.dataset.mapAColorMode === state.mapColorMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function getMapLayerMarkerColor(shop) {
    if (state.mapColorMode === 'visit') {
      return visits?.[shop?.id]?.logs?.length ? MAP_VISITED_COLOR : '#ffffff';
    }
    return typeof getMapCategoryColor === 'function' ? getMapCategoryColor(shop?.category, shop?.sourceType) : '#64748b';
  }

  function applyMapLayerMarkerStyles() {
    if (!isMapUiA()) return;
    Object.entries(markers || {}).forEach(([shopId, marker]) => {
      const shop = findShop(shopId);
      if (!shop || !marker?.setStyle) return;
      marker.setStyle({
        fillColor: getMapLayerMarkerColor(shop),
        color: state.mapColorMode === 'visit' ? '#25211f' : '#ffffff',
        weight: 2
      });
    });
    Object.values(markerHalos || {}).flat().forEach(halo => {
      halo?.setStyle?.({ opacity: state.mapColorMode === 'visit' ? 0 : 1 });
    });
    if (selectedShopIndicator && state.activeShopId) {
      const activeShop = findShop(state.activeShopId);
      if (activeShop) selectedShopIndicator.setStyle({ fillColor: getMapLayerMarkerColor(activeShop) });
    }
  }

  function handleCurrentLocationClick() {
    const legacyButton = document.getElementById('btn-nearby');
    if (!legacyButton || legacyButton.disabled) return;
    legacyButton.click();
    syncCurrentLocationButton();
    window.setTimeout(syncCurrentLocationButton, 250);
    window.setTimeout(syncCurrentLocationButton, 12000);
  }

  function syncCurrentLocationButton() {
    const button = document.getElementById('map-a-location-trigger');
    if (!button) return;
    const paused = window.isLocationUpdatesPaused?.() === true;
    const loading = !!isRequestingLocation;
    const active = !!userLocation && !!locationMapCentered && !loading;
    const following = active && !!followUserLocation;
    button.classList.toggle('is-active', active);
    button.classList.toggle('is-loading', loading);
    button.classList.toggle('is-following', following);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', loading
      ? '現在地を取得中'
      : paused ? '現在地の更新を再開'
      : following ? '現在地を追従中' : active ? '現在地を表示中' : '現在地を表示');
  }

  window.syncMapDiscoveryLocationButton = syncCurrentLocationButton;
  window.syncMapDiscoveryFilterControls = syncAllControls;

  function syncOpenToggle() {
    const button = document.getElementById('map-a-open-toggle');
    if (!button) return;
    const searchMode = state.searchResultMode;
    if (searchMode?.active) {
      const openOnly = !!searchMode.openOnly;
      button.classList.toggle('is-active', openOnly);
      button.classList.remove('is-scheduled');
      button.setAttribute('aria-pressed', String(openOnly));
      button.setAttribute('aria-label', openOnly
        ? '検索結果を営業中の店舗だけ表示中。全店舗表示に戻す'
        : '検索結果を全店舗表示中。営業中のみに絞る');
      const label = document.getElementById('map-a-open-label');
      if (label) label.textContent = openOnly ? '営業中' : '全店舗';
      return;
    }
    const hasScheduledTime = advancedFilterSettings.day !== '' && advancedFilterSettings.time !== '';
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    button.classList.toggle('is-active', !!showOpenOnly || hasScheduledTime);
    button.classList.toggle('is-scheduled', hasScheduledTime);
    button.setAttribute('aria-pressed', String(!!showOpenOnly || hasScheduledTime));
    button.setAttribute('aria-label', hasScheduledTime
      ? `${dayNames[Number(advancedFilterSettings.day)]}曜 ${advancedFilterSettings.time}に営業する店舗を表示中。現在時刻の営業中検索に戻す`
      : showOpenOnly
        ? '営業中の店舗だけ表示中。全店舗表示に戻す'
        : '全店舗を表示中。営業中のみに絞る');
    const label = document.getElementById('map-a-open-label');
    if (label) label.textContent = hasScheduledTime ? '指定時間' : showOpenOnly ? '営業中' : '全店舗';
  }

  function syncFilterLabel() {
    if (state.searchResultMode?.active) {
      syncSearchResultModeControls();
      return;
    }
    const selected = getEffectiveAdjustCategorySelection();
    const iekeiValues = getAdjustCategoryOptions('iekei').map(option => option.value);
    const isseValues = getAdjustCategoryOptions('isse').map(option => option.value);
    const hasIekei = iekeiValues.some(value => selected.has(value));
    const hasIsse = isseValues.some(value => selected.has(value));
    const hasJiro = getAdjustCategoryOptions('jiro').some(option => selected.has(option.value));
    const label = IS_JIRO_ONLY_MODE
      ? (hasIekei ? '二郎系' : '')
      : IS_MIXED_MODE
        ? (hasJiro && (hasIekei || hasIsse) ? '両方' : hasJiro ? '二郎系' : (hasIekei || hasIsse) ? '家系' : '')
        : hasIekei && !hasIsse ? '家系' : hasIsse && !hasIekei ? '壱系' : '';
    const badge = document.getElementById('map-a-filter-label');
    if (!badge) return;
    badge.textContent = label;
    badge.classList.toggle('is-visible', !!label);
    badge.setAttribute('aria-hidden', String(!label));
  }

  function openSearchSurface(options = {}) {
    closeAdjustPanel();
    const surface = document.getElementById('map-a-search-surface');
    const input = document.getElementById('map-a-search-input');
    if (!surface || !input) return;
    const wasOpen = surface.classList.contains('is-open');
    surface.classList.add('is-open');
    surface.setAttribute('aria-hidden', 'false');
    document.body.classList.add('map-a-search-open');
    if (!wasOpen && state.searchResultMode?.active) {
      input.value = state.searchResultMode.query;
    }
    if (!wasOpen && !options.fromHistory) {
      try {
        const currentState = history.state && typeof history.state === 'object' ? history.state : {};
        history.pushState({ ...currentState, [SEARCH_HISTORY_STATE]: true }, '', window.location.href);
      } catch (_) {}
    }
    syncShopSearchCategoryControls();
    renderSearchResults();
    // Keep the search action feeling immediate on mobile.  The surface fades in,
    // so focus once synchronously (to stay inside the tap gesture) and retry
    // after the first paint for WebKit/Android WebView keyboards.
    const focusSearchInput = () => {
      try {
        input.focus({ preventScroll: true });
      } catch (_) {
        input.focus();
      }
      if (typeof input.setSelectionRange === 'function') {
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch (_) {}
      }
    };
    focusSearchInput();
    requestAnimationFrame(focusSearchInput);
    setTimeout(focusSearchInput, 120);
  }

  function closeSearchSurface(options = {}) {
    const surface = document.getElementById('map-a-search-surface');
    const wasOpen = !!surface?.classList.contains('is-open');
    surface?.classList.remove('is-open');
    surface?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('map-a-search-open');
    closeSearchLineagePanel();
    document.getElementById('map-a-search-input')?.blur();
    cancelPlaceSearch(false);
    cancelGoogleSearch(false);
    if (wasOpen && !options.fromHistory) {
      try {
        if (history.state?.[SEARCH_HISTORY_STATE]) history.back();
      } catch (_) {}
    }
  }

  function clearSearchHistoryFlag() {
    try {
      const currentState = history.state && typeof history.state === 'object' ? { ...history.state } : {};
      delete currentState[SEARCH_HISTORY_STATE];
      history.replaceState(currentState, '', window.location.href);
    } catch (_) {}
  }

  function setSearchTab(tab) {
    if (tab !== 'shops' && tab !== 'places' && tab !== 'photo') return;
    closeSearchLineagePanel();
    state.searchTab = tab;
    document.querySelectorAll('[data-map-a-search-tab]').forEach(button => {
      const active = button.dataset.mapASearchTab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.getElementById('map-a-search-surface')?.classList.toggle('is-photo-tab', tab === 'photo');
    if (tab === 'places') schedulePlaceSearch(true);
    else if (tab === 'photo') {
      cancelPlaceSearch(true);
      cancelGoogleSearch(true);
      renderSearchResults();
    }
    else {
      cancelPlaceSearch(true);
      cancelGoogleSearch(true);
      state.googleExpanded = false;
      renderSearchResults();
    }
  }

  function renderSearchResults() {
    const results = document.getElementById('map-a-search-results');
    const input = document.getElementById('map-a-search-input');
    if (!results || !input) return;
    if (state.searchTab === 'shops') renderShopSearchResults(results, input.value.trim());
    else if (state.searchTab === 'places') renderPlaceSearchResults(results, input.value.trim());
    else renderPhotoLookup(results);
  }

  function setShopSearchTabCount(count = null) {
    const target = document.getElementById('map-a-shop-count');
    if (!target) return;
    const visible = typeof count === 'number' && Number.isFinite(count);
    target.hidden = !visible;
    target.textContent = visible ? String(count) : '';
  }

  function renderPhotoLookup(container) {
    const result = state.photoLookupResult;
    setShopSearchTabCount();
    const explanation = `<div class="map-a-search-empty-prompt map-a-photo-lookup-note">
      <span class="map-a-search-empty-icon map-a-search-photo-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="13" height="15" rx="2"></rect><circle cx="7" cy="9.5" r="1.5"></circle><path d="m4.5 17 3.5-3.5 2.2 2.2 2-2 1.3 1.3"></path><path d="M18.5 3.5a3 3 0 0 0-3 3c0 2.3 3 5.4 3 5.4s3-3.1 3-5.4a3 3 0 0 0-3-3Z"></path><circle cx="18.5" cy="6.5" r=".8" fill="currentColor" stroke="none"></circle></svg></span>
      <strong>写真の撮影場所からお店を探す</strong>
      <span>写真に保存された位置情報を読み取り、撮影場所の近くにあるラーメン店を表示します。</span>
      <span class="map-a-photo-caution">位置情報がない写真では検索できません。</span>
      <span class="map-a-photo-private">写真は端末内で処理され、外部へ送信されません。</span>
    </div>`;
    if (state.photoLookupStatus === 'loading') {
      container.innerHTML = `${explanation}<div class="map-a-search-state"><strong>写真を読み取り中…</strong><span>EXIF情報を確認しています。</span></div>`;
      return;
    }
    if (state.photoLookupStatus === 'unsupported') {
      container.innerHTML = `${explanation}<div class="map-a-photo-lookup-error"><strong>この写真を読み取れませんでした</strong><span>別の写真を選ぶか、iPhone・Androidアプリからお試しください。</span></div>${renderPhotoLookupButton('別の写真を選ぶ')}`;
      return;
    }
    if (state.photoLookupStatus === 'no-location') {
      container.innerHTML = `${explanation}${renderPhotoLookupPreview(result)}<div class="map-a-photo-lookup-error"><strong>位置情報が見つかりませんでした</strong><span>クラウド上の写真は、一度端末へダウンロードした原本でお試しください。</span></div>${renderPhotoLookupButton('別の写真を選ぶ')}`;
      return;
    }
    if (state.photoLookupStatus === 'ready' && result) {
      const candidates = getPhotoLookupCandidates(result.latitude, result.longitude);
      container.innerHTML = `${explanation}${renderPhotoLookupPreview(result)}
        <div class="map-a-search-summary">撮影場所に近いラーメン店</div>
        <div class="map-a-result-list">${candidates.map(candidate => `<button class="map-a-result-row" type="button" data-map-a-shop-result="${escapeAttribute(candidate.shop.id)}">
          <span class="map-a-result-icon">🍜</span>
          <span class="map-a-result-copy"><strong>${escapeText(candidate.shop.name)}</strong><span>${escapeText(candidate.shop.area || '')}</span></span>
          <span class="map-a-result-distance">${formatDistance(candidate.distance)}</span>
        </button>`).join('')}</div>${renderPhotoLookupButton('別の写真を選ぶ')}`;
      return;
    }
    container.innerHTML = `${explanation}${renderPhotoLookupButton('写真を選ぶ')}`;
  }

  function renderPhotoLookupButton(label) {
    return `<button class="map-a-photo-lookup-button" type="button" data-map-a-photo-lookup>${escapeText(label)}</button>`;
  }

  function renderPhotoLookupPreview(result) {
    if (!result) return '';
    const date = result.capturedAt ? new Date(result.capturedAt) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
      ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      : '撮影日時なし';
    return `<div class="map-a-photo-lookup-preview">${result.previewUrl ? `<img src="${escapeAttribute(result.previewUrl)}" alt="選択した写真">` : '<span>写真</span>'}<div><strong>${dateLabel}</strong><span>${Number.isFinite(Number(result.latitude)) && Number.isFinite(Number(result.longitude)) ? '位置情報を読み取りました' : '位置情報なし'}</span></div></div>`;
  }

  function getPhotoLookupCandidates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return [];
    return (Array.isArray(shops) ? shops : [])
      .filter(shop => shop?.name !== 'ダミー' && Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng)) && Number(shop.lat) !== 0 && Number(shop.lng) !== 0)
      .map(shop => ({ shop, distance: calculateDistance(lat, lng, Number(shop.lat), Number(shop.lng)) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }

  function startPhotoLookup() {
    if (window.webkit?.messageHandlers?.pickPhotos) {
      state.photoLookupStatus = 'loading';
      state.photoLookupResult = null;
      renderSearchResults();
      window.webkit.messageHandlers.pickPhotos.postMessage(JSON.stringify({ mode: 'reverse', selectionLimit: 1 }));
      return;
    }
    const input = document.getElementById('map-a-photo-lookup-input');
    if (input && typeof FileReader !== 'undefined') {
      input.value = '';
      input.click();
      return;
    }
    state.photoLookupStatus = 'unsupported';
    renderSearchResults();
  }

  async function handleBrowserPhotoLookup(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    state.photoLookupStatus = 'loading';
    state.photoLookupResult = null;
    renderSearchResults();
    try {
      const [buffer, previewUrl] = await Promise.all([
        file.arrayBuffer(),
        readBrowserPhotoPreview(file)
      ]);
      const metadata = readBrowserPhotoMetadata(buffer);
      const capturedAt = metadata.capturedAt
        || (Number.isFinite(file.lastModified) && file.lastModified > 0 ? new Date(file.lastModified).toISOString() : null);
      window.onPhotoReverseLookupSelected({
        previewUrl,
        capturedAt,
        latitude: metadata.latitude,
        longitude: metadata.longitude
      });
    } catch (_) {
      state.photoLookupStatus = 'unsupported';
      state.photoLookupResult = null;
      renderSearchResults();
    }
  }

  function readBrowserPhotoPreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error || new Error('写真を読み取れませんでした'));
      reader.readAsDataURL(file);
    });
  }

  function readBrowserPhotoMetadata(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const tiffOffset = findBrowserExifTiffOffset(view, bytes);
    if (tiffOffset < 0) return {};
    return readBrowserTiffMetadata(view, tiffOffset);
  }

  function findBrowserExifTiffOffset(view, bytes) {
    const length = view.byteLength;
    if (length >= 8 && ((view.getUint16(0, false) === 0x4949 && view.getUint16(2, true) === 42)
      || (view.getUint16(0, false) === 0x4d4d && view.getUint16(2, false) === 42))) return 0;

    // JPEG APP1 (Exif)
    if (length >= 4 && view.getUint16(0, false) === 0xffd8) {
      let offset = 2;
      while (offset + 4 <= length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xd9 || marker === 0xda) break;
        const segmentLength = view.getUint16(offset + 2, false);
        if (segmentLength < 2 || offset + 2 + segmentLength > length) break;
        if (marker === 0xe1 && segmentLength >= 8
          && bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78
          && bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66
          && bytes[offset + 8] === 0 && bytes[offset + 9] === 0) return offset + 10;
        offset += 2 + segmentLength;
      }
    }

    // PNG eXIf chunk
    if (length >= 12 && view.getUint32(0, false) === 0x89504e47 && view.getUint32(4, false) === 0x0d0a1a0a) {
      let offset = 8;
      while (offset + 12 <= length) {
        const chunkLength = view.getUint32(offset, false);
        if (offset + 12 + chunkLength > length) break;
        const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        if (type === 'eXIf') return offset + 8;
        offset += 12 + chunkLength;
      }
    }

    // WebP EXIF chunk
    if (length >= 16 && asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 4) === 'WEBP') {
      let offset = 12;
      while (offset + 8 <= length) {
        const type = asciiAt(bytes, offset, 4);
        const chunkLength = view.getUint32(offset + 4, true);
        const dataOffset = offset + 8;
        if (dataOffset + chunkLength > length) break;
        if (type === 'EXIF') {
          return asciiAt(bytes, dataOffset, 6) === 'Exif\0\0' ? dataOffset + 6 : dataOffset;
        }
        offset = dataOffset + chunkLength + (chunkLength % 2);
      }
    }
    return -1;
  }

  function asciiAt(bytes, offset, length) {
    if (offset < 0 || offset + length > bytes.length) return '';
    let value = '';
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(bytes[offset + index]);
    return value;
  }

  function readBrowserTiffMetadata(view, tiffOffset) {
    const length = view.byteLength;
    if (tiffOffset < 0 || tiffOffset + 8 > length) return {};
    const byteOrder = view.getUint16(tiffOffset, false);
    const little = byteOrder === 0x4949;
    if (!little && byteOrder !== 0x4d4d) return {};
    if (view.getUint16(tiffOffset + 2, little) !== 42) return {};
    const inRange = (offset, size = 1) => offset >= 0 && offset + size <= length;
    const typeSize = type => ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 0);
    const readEntries = relativeOffset => {
      const ifdOffset = tiffOffset + Number(relativeOffset || 0);
      if (!inRange(ifdOffset, 2)) return new Map();
      const count = Math.min(view.getUint16(ifdOffset, little), 512);
      const entries = new Map();
      for (let index = 0; index < count; index += 1) {
        const entryOffset = ifdOffset + 2 + index * 12;
        if (!inRange(entryOffset, 12)) break;
        const tag = view.getUint16(entryOffset, little);
        const type = view.getUint16(entryOffset + 2, little);
        const itemCount = view.getUint32(entryOffset + 4, little);
        const size = typeSize(type) * itemCount;
        if (!size || size > length) continue;
        const valueOffset = size <= 4 ? entryOffset + 8 : tiffOffset + view.getUint32(entryOffset + 8, little);
        if (inRange(valueOffset, size)) entries.set(tag, { type, count: itemCount, offset: valueOffset });
      }
      return entries;
    };
    const scalar = entry => {
      if (!entry || !inRange(entry.offset, 1)) return null;
      if (entry.type === 1 || entry.type === 7) return view.getUint8(entry.offset);
      if (entry.type === 3 && inRange(entry.offset, 2)) return view.getUint16(entry.offset, little);
      if (entry.type === 4 && inRange(entry.offset, 4)) return view.getUint32(entry.offset, little);
      return null;
    };
    const ascii = entry => {
      if (!entry) return '';
      const bytes = new Uint8Array(view.buffer, view.byteOffset + entry.offset, entry.count);
      return Array.from(bytes, value => value ? String.fromCharCode(value) : '').join('').trim();
    };
    const rationals = entry => {
      if (!entry || (entry.type !== 5 && entry.type !== 10)) return [];
      const signed = entry.type === 10;
      const values = [];
      for (let index = 0; index < entry.count; index += 1) {
        const offset = entry.offset + index * 8;
        if (!inRange(offset, 8)) break;
        const numerator = signed ? view.getInt32(offset, little) : view.getUint32(offset, little);
        const denominator = signed ? view.getInt32(offset + 4, little) : view.getUint32(offset + 4, little);
        values.push(denominator ? numerator / denominator : 0);
      }
      return values;
    };
    const ifd0 = readEntries(view.getUint32(tiffOffset + 4, little));
    const gpsPointer = scalar(ifd0.get(0x8825));
    const gps = gpsPointer !== null ? readEntries(gpsPointer) : new Map();
    const coordinate = values => values.length >= 3 ? values[0] + values[1] / 60 + values[2] / 3600 : null;
    let latitude = coordinate(rationals(gps.get(0x0002)));
    let longitude = coordinate(rationals(gps.get(0x0004)));
    const latitudeRef = ascii(gps.get(0x0001)).toUpperCase();
    const longitudeRef = ascii(gps.get(0x0003)).toUpperCase();
    if (latitude !== null && latitudeRef === 'S') latitude *= -1;
    if (longitude !== null && longitudeRef === 'W') longitude *= -1;

    const exifPointer = scalar(ifd0.get(0x8769));
    const exif = exifPointer !== null ? readEntries(exifPointer) : new Map();
    const rawDate = ascii(exif.get(0x9003)) || ascii(exif.get(0x9004)) || ascii(ifd0.get(0x0132));
    const match = rawDate.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    const capturedAt = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])).toISOString()
      : null;
    return { latitude, longitude, capturedAt };
  }

  window.onPhotoReverseLookupSelected = payload => {
    const latitude = Number(payload?.latitude);
    const longitude = Number(payload?.longitude);
    state.photoLookupResult = payload || null;
    state.photoLookupStatus = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0
      ? 'ready'
      : 'no-location';
    if (state.searchTab === 'photo') renderSearchResults();
  };

  window.onPhotoReverseLookupCancelled = () => {
    const latitude = Number(state.photoLookupResult?.latitude);
    const longitude = Number(state.photoLookupResult?.longitude);
    state.photoLookupStatus = !state.photoLookupResult ? 'idle' :
      (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0 ? 'ready' : 'no-location');
    if (state.searchTab === 'photo') renderSearchResults();
  };

  function getShopSearchCategorySummary() {
    const selected = getEffectiveShopSearchCategorySelection();
    const allValues = getAllAdjustCategoryValues();
    if (allValues.length > 0 && allValues.every(value => selected.has(value))) return 'すべて';
    const iekeiValues = getAdjustCategoryOptions('iekei').map(option => option.value);
    const isseValues = getAdjustCategoryOptions('isse').map(option => option.value);
    const hasAllIekei = iekeiValues.length > 0 && iekeiValues.every(value => selected.has(value));
    const hasAllIsse = isseValues.length > 0 && isseValues.every(value => selected.has(value));
    if (hasAllIekei && isseValues.every(value => !selected.has(value))) return '家系全部';
    if (hasAllIsse && iekeiValues.every(value => !selected.has(value))) return '壱系全部';
    const selectedValues = allValues.filter(value => selected.has(value));
    if (!selectedValues.length) return 'なし';
    if (selectedValues.length === 1) return getShortCategoryName(selectedValues[0]);
    return `${selectedValues.length}系統`;
  }

  function renderShopSearchToolbar(showSort) {
    const categorySummary = getShopSearchCategorySummary();
    return `<div class="map-a-shop-search-toolbar ${showSort && state.shopSearchNewOnly ? 'has-open-sort' : ''}">
      ${showSort ? `<div class="map-a-shop-search-sort" role="group" aria-label="店舗検索の並び順">
        <button class="${state.shopSearchSort === 'name' ? 'is-active' : ''}" type="button" data-map-a-shop-search-sort="name" aria-pressed="${state.shopSearchSort === 'name'}" aria-label="名前の一致順">名前順</button>
        <button class="${state.shopSearchSort === 'distance' ? 'is-active' : ''}" type="button" data-map-a-shop-search-sort="distance" aria-pressed="${state.shopSearchSort === 'distance'}">距離順</button>
        ${state.shopSearchNewOnly ? `<button class="${state.shopSearchSort === 'open' ? 'is-active' : ''}" type="button" data-map-a-shop-search-sort="open" aria-pressed="${state.shopSearchSort === 'open'}" aria-label="開店日の新しい順">Open順</button>` : ''}
      </div>` : '<span class="map-a-shop-search-toolbar-label">店舗を探す</span>'}
      <div class="map-a-shop-search-filter-actions">
        <button class="map-a-shop-search-lineage-trigger ${state.shopSearchCategories !== null ? 'is-active' : ''}" type="button" data-map-a-search-lineage-open aria-expanded="false">系統：${escapeText(categorySummary)} <span aria-hidden="true">⌄</span></button>
        <button class="map-a-shop-search-new-trigger ${state.shopSearchNewOnly ? 'is-active' : ''}" type="button" data-map-a-shop-search-new aria-pressed="${state.shopSearchNewOnly}">新店舗</button>
      </div>
    </div>`;
  }

  function renderShopSearchUpdatedAt() {
    return `<div id="map-a-search-updated-at" class="map-a-search-updated-at">${getMapDiscoveryUpdatedAtText()}</div>`;
  }

  function renderShopSearchHistory() {
    if (!state.shopSearchHistory.length) return '';
    return `<section class="map-a-shop-search-history" aria-label="最近の検索">
      <div class="map-a-shop-search-history-head">
        <strong>最近の検索</strong>
        <button type="button" data-map-a-search-history-clear>すべて削除</button>
      </div>
      <div class="map-a-shop-search-history-list">
        ${state.shopSearchHistory.map((query, index) => `<div class="map-a-shop-search-history-row">
          <button class="map-a-shop-search-history-query" type="button" data-map-a-search-history-use="${index}"><span aria-hidden="true">◷</span><strong>${escapeText(query)}</strong></button>
          <button class="map-a-shop-search-history-delete" type="button" data-map-a-search-history-delete="${index}" aria-label="${escapeAttribute(query)}を履歴から削除">×</button>
        </div>`).join('')}
      </div>
    </section>`;
  }

  function openSearchLineagePanel() {
    document.getElementById('map-a-search-input')?.blur();
    syncShopSearchCategoryControls();
    document.getElementById('map-a-search-lineage-panel')?.classList.add('is-open');
    document.getElementById('map-a-search-lineage-panel')?.setAttribute('aria-hidden', 'false');
    document.getElementById('map-a-search-lineage-scrim')?.classList.add('is-open');
    document.querySelector('[data-map-a-search-lineage-open]')?.setAttribute('aria-expanded', 'true');
  }

  function closeSearchLineagePanel() {
    document.getElementById('map-a-search-lineage-panel')?.classList.remove('is-open');
    document.getElementById('map-a-search-lineage-panel')?.setAttribute('aria-hidden', 'true');
    document.getElementById('map-a-search-lineage-scrim')?.classList.remove('is-open');
    document.querySelector('[data-map-a-search-lineage-open]')?.setAttribute('aria-expanded', 'false');
  }

  function syncShopSearchCategoryControls() {
    const selected = getEffectiveShopSearchCategorySelection();
    const allValues = getAllAdjustCategoryValues();
    document.querySelectorAll('[data-map-a-search-category]').forEach(button => {
      const active = selected.has(button.dataset.mapASearchCategory);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-map-a-search-category-group]').forEach(button => {
      const values = getAdjustCategoryOptions(button.dataset.mapASearchCategoryGroup).map(option => option.value);
      const active = values.length > 0 && values.every(value => selected.has(value));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const allSelected = allValues.length > 0 && allValues.every(value => selected.has(value));
    const allButton = document.querySelector('[data-map-a-search-category-all]');
    allButton?.classList.toggle('is-active', allSelected);
    allButton?.setAttribute('aria-pressed', String(allSelected));
  }

  function getEffectiveShopSearchCategorySelection() {
    return new Set(state.shopSearchCategories === null
      ? getAllAdjustCategoryValues()
      : state.shopSearchCategories);
  }

  function storeShopSearchCategorySelection(selected) {
    const allValues = getAllAdjustCategoryValues();
    state.shopSearchCategories = allValues.length > 0 && allValues.every(value => selected.has(value))
      ? null
      : allValues.filter(value => selected.has(value));
  }

  function toggleShopSearchCategory(category) {
    if (!category) return;
    const selected = getEffectiveShopSearchCategorySelection();
    if (selected.has(category)) selected.delete(category);
    else selected.add(category);
    storeShopSearchCategorySelection(selected);
    syncShopSearchCategoryControls();
    renderSearchResults();
  }

  function toggleShopSearchCategoryGroup(group) {
    const values = getAdjustCategoryOptions(group).map(option => option.value);
    if (!values.length) return;
    const selected = getEffectiveShopSearchCategorySelection();
    const groupSelected = values.every(value => selected.has(value));
    values.forEach(value => {
      if (groupSelected) selected.delete(value);
      else selected.add(value);
    });
    storeShopSearchCategorySelection(selected);
    syncShopSearchCategoryControls();
    renderSearchResults();
  }

  function resetShopSearchCategories() {
    state.shopSearchCategories = null;
    syncShopSearchCategoryControls();
    renderSearchResults();
  }

  function getShopSearchNameValues(shop) {
    return [
      shop?.mapLabel,
      shop?.shortName,
      shop?.['店舗名省略'],
      shop?.['店舗名の省略'],
      shop?.name
    ].filter(value => String(value || '').trim());
  }

  function normalizeShopSearchName(value) {
    return normalizeSearch(String(value || '').replace(/^\s*[【\[]\s*new\s*[】\]]\s*/i, ''));
  }

  function hasNewShopMarker(shop) {
    const name = String(shop?.name || '');
    const markers = name.matchAll(/【([^】]*)】|\[([^\]]*)\]/g);
    for (const marker of markers) {
      const label = String(marker[1] ?? marker[2] ?? '').normalize('NFKC').trim().toLocaleLowerCase('ja');
      if (label === 'new' || label.includes('open')) return true;
    }
    return false;
  }

  window.isMapDiscoveryNewShop = hasNewShopMarker;

  function parseJapaneseOpenDate(value, fallbackYear, requireStart = false) {
    const text = String(value || '').normalize('NFKC');
    const prefix = requireStart ? '^\\s*' : '';
    const pattern = new RegExp(`${prefix}(?:(\\d{4})年\\s*)?(\\d{1,2})月\\s*(?:(\\d{1,2})日|(初旬|上旬|中旬|下旬)|(中)(?!旬))?`);
    const match = text.match(pattern);
    if (!match) return NaN;
    const year = Number(match[1]) || fallbackYear;
    const month = Number(match[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return NaN;
    const period = match[4] || '';
    const approximateDay = period === '初旬' || period === '上旬'
      ? 5
      : period === '下旬'
        ? 25
        : 15;
    const day = match[3] ? Number(match[3]) : approximateDay;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (!Number.isInteger(day) || day < 1 || day > daysInMonth) return NaN;
    return Date.UTC(year, month - 1, day);
  }

  function getShopOpenSortValue(shop) {
    const name = String(shop?.name || '');
    const fallbackYear = new Date().getFullYear();
    const dates = [];
    let hasNewMarker = false;
    for (const marker of name.matchAll(/【([^】]*)】|\[([^\]]*)\]/g)) {
      const label = String(marker[1] ?? marker[2] ?? '').normalize('NFKC').trim();
      const normalizedLabel = label.toLocaleLowerCase('ja');
      if (normalizedLabel === 'new') hasNewMarker = true;
      if (normalizedLabel.includes('open')) {
        const markerDate = parseJapaneseOpenDate(label, fallbackYear);
        if (Number.isFinite(markerDate)) dates.push(markerDate);
      }
    }
    if (hasNewMarker) {
      const descriptionDate = parseJapaneseOpenDate(shop?.description, fallbackYear, true);
      if (Number.isFinite(descriptionDate)) dates.push(descriptionDate);
    }
    return dates.length ? Math.max(...dates) : NaN;
  }

  function getNewShopOpenLabel(shop) {
    const name = String(shop?.name || '');
    const hasNewMarker = Array.from(name.matchAll(/【([^】]*)】|\[([^\]]*)\]/g)).some(marker =>
      String(marker[1] ?? marker[2] ?? '').normalize('NFKC').trim().toLocaleLowerCase('ja') === 'new'
    );
    if (!hasNewMarker) return '';
    const description = String(shop?.description || '').normalize('NFKC');
    const match = description.match(/^\s*((?:\d{4}年\s*)?\d{1,2}月\s*(?:(?:\d{1,2})日|初旬|上旬|中旬|下旬|中)?)/);
    if (!match) return '';
    return `${match[1].replace(/\s+/g, '')}open`;
  }

  function getShopSearchRank(shop, normalizedQuery) {
    if (!normalizedQuery) return 0;
    const names = getShopSearchNameValues(shop).map(normalizeShopSearchName).filter(Boolean);
    const reading = normalizeSearch(shop?.nameHiragana);
    const area = normalizeSearch(shop?.area);
    if (names.some(value => value === normalizedQuery)) return 0;
    if (names.some(value => value.startsWith(normalizedQuery))) return 1;
    if (names.some(value => value.includes(normalizedQuery))) return 2;
    if (reading === normalizedQuery) return 3;
    if (reading.startsWith(normalizedQuery)) return 4;
    if (reading.includes(normalizedQuery)) return 5;
    if (area === normalizedQuery) return 6;
    if (area.startsWith(normalizedQuery)) return 7;
    if (area.includes(normalizedQuery)) return 8;
    return Infinity;
  }

  function compareShopSearchNames(a, b) {
    const aName = normalizeSearch(a.shop.nameHiragana) || normalizeShopSearchName(a.shop.name);
    const bName = normalizeSearch(b.shop.nameHiragana) || normalizeShopSearchName(b.shop.name);
    const nameDiff = String(aName).localeCompare(String(bName), 'ja', { sensitivity: 'base', numeric: true });
    if (nameDiff) return nameDiff;
    return String(a.shop.id).localeCompare(String(b.shop.id), 'ja', { sensitivity: 'base', numeric: true });
  }

  function renderShopSearchResults(container, query) {
    const normalized = normalizeSearch(query);
    const center = getMapFocusLatLng();
    const distanceOrigin = userLocation || center;
    const selectedCategories = Array.from(getEffectiveShopSearchCategorySelection());
    const hasCategoryFilter = state.shopSearchCategories !== null;
    const hasNewFilter = state.shopSearchNewOnly;
    const hasSearchFilter = hasCategoryFilter || hasNewFilter;
    const showSort = !!normalized || hasSearchFilter;
    if (!normalized && !hasSearchFilter) {
      setShopSearchTabCount();
      container.innerHTML = `${renderShopSearchToolbar(false)}
        ${renderShopSearchUpdatedAt()}
        ${renderShopSearchHistory()}
        <div class="map-a-search-empty-prompt">
          <span class="map-a-search-empty-icon" aria-hidden="true">⌕</span>
          <strong>お店を検索</strong>
          <span>店名はひらがなでも検索できます。店名・駅名・地名を入力して、マップで探しましょう。</span>
        </div>`;
      return;
    }
    let candidates = (Array.isArray(shops) ? shops : []).filter(shop =>
      shop.name !== 'ダミー' && hasValidMapCoordinates(shop)
    );
    if (hasCategoryFilter) {
      candidates = candidates.filter(shop => selectedCategories.includes(shop.category));
    }
    if (hasNewFilter) {
      candidates = candidates.filter(hasNewShopMarker);
    }
    candidates = candidates.map(shop => ({
      shop,
      rank: getShopSearchRank(shop, normalized),
      distance: calculateDistance(distanceOrigin.lat, distanceOrigin.lng, Number(shop.lat), Number(shop.lng)),
      openDate: getShopOpenSortValue(shop)
    })).filter(item => Number.isFinite(item.rank));
    candidates.sort((a, b) => {
      if (!showSort || state.shopSearchSort === 'distance') {
        return (a.distance - b.distance) || (a.rank - b.rank) || compareShopSearchNames(a, b);
      }
      if (state.shopSearchSort === 'open') {
        const aHasDate = Number.isFinite(a.openDate);
        const bHasDate = Number.isFinite(b.openDate);
        if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
        if (aHasDate && a.openDate !== b.openDate) return b.openDate - a.openDate;
        return (a.rank - b.rank) || compareShopSearchNames(a, b) || (a.distance - b.distance);
      }
      return (a.rank - b.rank) || compareShopSearchNames(a, b) || (a.distance - b.distance);
    });
    const totalCount = candidates.length;
    candidates = candidates.slice(0, 60);
    setShopSearchTabCount(totalCount);
    const categorySummary = getShopSearchCategorySummary();
    const history = !normalized && !hasSearchFilter ? renderShopSearchHistory() : '';
    const summaryConditions = [];
    if (normalized) summaryConditions.push(`「${escapeText(query)}」`);
    if (hasCategoryFilter) summaryConditions.push(escapeText(categorySummary));
    if (hasNewFilter) summaryConditions.push('新店舗');
    const summary = summaryConditions.length
      ? `${summaryConditions.join('・')}の登録店舗`
      : '地図の中心付近にある登録店舗';
    const localResults = candidates.length
      ? `${renderShopSearchToolbar(showSort)}
        ${renderShopSearchUpdatedAt()}
        ${history}
        <div class="map-a-search-summary">${summary}</div>
        <div class="map-a-result-list">
          ${candidates.map(({ shop, distance }) => {
          const status = getOpenStatus(shop.openingHours);
          const statusLabel = !shop.openingHours
            ? (shop.closed ? '閉店' : '営業時間不明')
            : status.state === 'open' ? '営業中' : status.state === 'soon' ? '閉店間近' : '時間外';
          const isVisited = !!visits?.[shop.id]?.logs?.length;
          const newShopOpenLabel = hasNewFilter ? getNewShopOpenLabel(shop) : '';
          const googleMapUrl = String(shop.googleMapUrl || '').trim()
            || (Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng))
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.lat},${shop.lng}`)}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${shop.area || ''}`.trim())}`);
          return `<div class="map-a-result-entry">
            <button class="map-a-result-row" type="button" data-map-a-shop-result="${escapeAttribute(shop.id)}">
              <span class="map-a-result-icon ${isVisited ? 'is-visited' : ''}" aria-hidden="true">${isVisited ? '✓' : '🍜'}</span>
              <span class="map-a-result-copy"><strong>${escapeText(shop.name)}</strong><span>${escapeText(getShortCategoryName(shop.category, shop.sourceType))} · ${escapeText(shop.area || '')} · ${statusLabel}</span>${newShopOpenLabel ? `<span class="map-a-result-open-date">${escapeText(newShopOpenLabel)}</span>` : ''}</span>
              <span class="map-a-result-distance">${Number.isFinite(distance) ? formatDistance(distance) : ''}</span>
            </button>
            <div class="map-a-result-actions">
              <button class="map-a-result-detail" type="button" data-map-a-shop-detail="${escapeAttribute(shop.id)}">詳細</button>
              <details class="map-a-result-more">
                <summary aria-label="${escapeAttribute(shop.name)}のその他の操作">•••</summary>
                <div class="map-a-result-menu" role="menu">
                  <a href="${escapeAttribute(googleMapUrl)}" target="_blank" rel="noopener noreferrer" role="menuitem">${icons.map}<span>Googleマップ</span></a>
                  <button type="button" role="menuitem" data-map-a-correction="${escapeAttribute(shop.id)}">情報を修正申請</button>
                </div>
              </details>
            </div>
          </div>`;
        }).join('')}
        </div>`
      : `${renderShopSearchToolbar(showSort)}
        ${renderShopSearchUpdatedAt()}
        <div class="map-a-search-state map-a-search-state-compact"><strong>登録店舗には見つかりませんでした</strong><span>${hasSearchFilter ? '絞り込み条件を変えてお試しください。' : 'Google Mapsの候補も確認できます。'}</span></div>`;

    container.innerHTML = `${localResults}${normalized ? renderGoogleShopResults(query) : ''}`;
  }

  function renderGoogleShopResults(query) {
    if (query.length < 2) {
      return '<div class="map-a-search-hint">店名を2文字以上入力して検索してください。</div>';
    }
    if (!state.googleExpanded) {
      return `<button class="map-a-not-found-button" type="button" data-map-a-google-expand>
        <strong>見つからない場合はこちら</strong>
        <span>Google Mapsの候補を確認して、店舗追加を申請できます</span>
      </button>`;
    }
    const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    let body = '';
    if (state.googleLoading) {
      body = '<div class="map-a-google-state">Google Mapsを検索中…</div>';
    } else if (state.googleError) {
      body = `<div class="map-a-google-state">${escapeText(state.googleError)}</div>`;
    } else if (!state.googleResults.length) {
      body = '<div class="map-a-google-state">Google Mapsにも候補が見つかりませんでした。</div>';
    } else {
      body = `<div class="map-a-google-list">${state.googleResults.map((place, index) => {
        const registeredShop = findLikelyRegisteredShop(place.name);
        return `<article class="map-a-google-row">
          <a class="map-a-google-place" href="${escapeAttribute(place.googleMapsUri)}" target="_blank" rel="noopener noreferrer">
            <span class="map-a-google-pin">G</span>
            <span class="map-a-result-copy"><strong>${escapeText(place.name)}</strong><span>${escapeText(place.address || '住所情報なし')}</span></span>
            <span class="map-a-google-open">${icons.chevron}</span>
          </a>
          ${registeredShop
            ? `<button class="map-a-google-registered" type="button" data-map-a-shop-result="${escapeAttribute(registeredShop.id)}">登録済み店舗を開く</button>`
            : `<button class="map-a-google-apply" type="button" data-map-a-google-apply="${index}">この店舗を追加申請</button>`}
        </article>`;
      }).join('')}</div>`;
    }
    return `<section class="map-a-google-section" aria-label="Google Mapsの検索結果">
      <div class="map-a-google-heading"><strong>Google Mapsの候補</strong><span>Google</span></div>
      ${body}
      <div class="map-a-google-actions">
        <a href="${googleMapsSearchUrl}" target="_blank" rel="noopener noreferrer">Google Mapsですべて見る</a>
        <button type="button" data-map-a-manual-apply>見つからない店舗を追加申請</button>
      </div>
    </section>`;
  }

  function findLikelyRegisteredShop(name) {
    const normalizedName = normalizeSearch(name);
    if (!normalizedName) return null;
    return (Array.isArray(shops) ? shops : []).find(shop =>
      shop.name !== 'ダミー' && normalizeSearch(shop.name) === normalizedName
    ) || null;
  }

  function submitShopSearch() {
    const input = document.getElementById('map-a-search-input');
    if (!input) return;
    input.blur();
    if (state.searchTab === 'shops') saveShopSearchHistory(input.value);
    state.googleExpanded = false;
    cancelGoogleSearch(true);
    renderSearchResults();
  }

  function submitCurrentSearch() {
    const input = document.getElementById('map-a-search-input');
    if (!input) return;
    if (state.searchTab === 'places') {
      input.blur();
      runPlaceSearch(input.value.trim());
      return;
    }
    submitShopSearch();
  }

  function cancelGoogleSearch(clearResults) {
    window.clearTimeout(state.googleTimer);
    state.googleTimer = 0;
    state.googleController?.abort();
    state.googleController = null;
    state.googleSequence += 1;
    state.googleLoading = false;
    if (clearResults) state.googleResults = [];
  }

  async function runGoogleSearch(query) {
    const querySnapshot = String(query || '').trim();
    if (querySnapshot.length < 2 || state.searchTab !== 'shops') return;
    window.clearTimeout(state.googleTimer);
    state.googleTimer = 0;
    state.googleController?.abort();
    state.googleController = new AbortController();
    const sequence = ++state.googleSequence;
    const controller = state.googleController;
    state.googleLoading = true;
    state.googleError = '';
    state.googleResults = [];
    renderSearchResults();
    const center = getMapFocusLatLng();
    try {
      const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : ''
        },
        body: JSON.stringify({ query: querySnapshot, latitude: center.lat, longitude: center.lng }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      const currentQuery = document.getElementById('map-a-search-input')?.value.trim() || '';
      if (sequence !== state.googleSequence || currentQuery !== querySnapshot || state.searchTab !== 'shops') return;
      if (!response.ok) {
        throw new Error(data?.code === 'not_configured'
          ? 'Google Maps検索は準備中です。下のボタンからGoogle Mapsで検索できます。'
          : 'Google Mapsの候補を取得できませんでした。');
      }
      state.googleResults = Array.isArray(data.places) ? data.places.slice(0, 8) : [];
      state.googleLoading = false;
      state.googleController = null;
      renderSearchResults();
    } catch (error) {
      if (error?.name === 'AbortError' || sequence !== state.googleSequence) return;
      state.googleLoading = false;
      state.googleController = null;
      state.googleError = String(error?.message || '').startsWith('Google Maps')
        ? error.message
        : 'Google Mapsの候補を取得できませんでした。下のボタンからGoogle Mapsで検索できます。';
      renderSearchResults();
    }
  }

  function renderPlaceSearchResults(container, query) {
    setShopSearchTabCount();
    if (query.length < 2) {
      container.innerHTML = '<div class="map-a-search-empty-prompt"><span class="map-a-search-empty-icon map-a-search-place-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5.5"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg></span><strong>地名・駅を検索</strong><span>駅名や地名を2文字以上入力してください。</span></div>';
      return;
    }
    if (state.placeLoading) {
      container.innerHTML = '<div class="map-a-search-state"><strong>地点を検索中…</strong><span>候補をまとめています。</span></div>';
      return;
    }
    if (state.placeError) {
      container.innerHTML = `<div class="map-a-search-state"><strong>地点を検索できませんでした</strong><span>${escapeText(state.placeError)}</span></div>`;
      return;
    }
    if (!state.placeResults.length) {
      container.innerHTML = '<div class="map-a-search-state"><strong>地点が見つかりませんでした</strong><span>別の駅名・地名で試してください。</span></div>';
      return;
    }
    const renderGroup = (title, entries) => entries.length ? `
      <section class="map-a-place-result-group" aria-label="${escapeAttribute(title)}">
        <div class="map-a-place-result-group-title">${escapeText(title)}</div>
        <div class="map-a-result-list">
          ${entries.map(({ place, index }) => `<button class="map-a-result-row" type="button" data-map-a-place-result="${index}">
          <span class="map-a-result-icon">${place.type === 'station' ? '駅' : '⌖'}</span>
          <span class="map-a-result-copy"><strong>${escapeText(place.name)}</strong><span>${escapeText(place.meta || (place.type === 'station' ? '駅' : '地名・住所'))}</span></span>
          <span class="map-a-result-distance">${icons.chevron}</span>
          </button>`).join('')}
        </div>
      </section>` : '';
    const indexed = state.placeResults.map((place, index) => ({ place, index }));
    const transport = indexed.filter(item => item.place.group === 'transport');
    const addresses = indexed.filter(item => item.place.group !== 'transport');
    container.innerHTML = `
      <div class="map-a-search-summary">「${escapeText(query)}」の地名・駅検索結果</div>
      ${renderGroup('駅・インター', transport)}
      ${renderGroup('地名・住所', addresses)}`;
  }

  function schedulePlaceSearch(immediate = false) {
    cancelPlaceSearch(true);
    const query = document.getElementById('map-a-search-input')?.value.trim() || '';
    if (state.searchTab !== 'places' || query.length < 2) {
      renderSearchResults();
      return;
    }
    state.placeLoading = true;
    state.placeError = '';
    state.placeResults = [];
    renderSearchResults();
    state.placeTimer = window.setTimeout(() => runPlaceSearch(query), immediate ? 0 : PLACE_SEARCH_DELAY);
  }

  function cancelPlaceSearch(clearResults) {
    window.clearTimeout(state.placeTimer);
    state.placeTimer = 0;
    state.placeController?.abort();
    state.placeController = null;
    state.placeSequence += 1;
    state.placeLoading = false;
    if (clearResults) state.placeResults = [];
  }

  function getGsiPrefecture(addressCode) {
    const prefectures = [
      '', '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
      '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
      '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
      '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
      '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
    ];
    const raw = String(addressCode || '').replace(/^0+/, '');
    if (!raw) return '';
    const key = raw.length <= 4 ? raw.slice(0, 1) : raw.slice(0, 2);
    return prefectures[Number(key)] || '';
  }

  async function runPlaceSearch(query) {
    const querySnapshot = String(query || '').trim();
    if (querySnapshot.length < 2) return;
    window.clearTimeout(state.placeTimer);
    state.placeTimer = 0;
    state.placeController?.abort();
    state.placeController = new AbortController();
    const sequence = ++state.placeSequence;
    const controller = state.placeController;
    state.placeLoading = true;
    state.placeError = '';
    state.placeResults = [];
    renderSearchResults();
    try {
      const [gsiResponse, stationResponse] = await Promise.allSettled([
        fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(querySnapshot)}`, { signal: controller.signal }),
        fetch(`https://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(querySnapshot.replace(/駅$/, ''))}`, { signal: controller.signal })
      ]);
      if (sequence !== state.placeSequence) return;
      const stationItems = [];
      if (stationResponse.status === 'fulfilled' && stationResponse.value.ok) {
        const stationData = await stationResponse.value.json().catch(() => ({}));
        const seenStations = new Set();
        (stationData?.response?.station || []).forEach(station => {
          const key = `${station.name}_${station.prefecture}`;
          if (seenStations.has(key) || stationItems.length >= 4) return;
          seenStations.add(key);
          stationItems.push({
            name: `${station.name}駅`,
            meta: `${station.prefecture}・${station.line}`,
            lat: Number(station.y), lng: Number(station.x), type: 'station', group: 'transport'
          });
        });
      }

      const gsiTransport = [];
      const gsiAddresses = [];
      if (gsiResponse.status === 'fulfilled' && gsiResponse.value.ok) {
        const gsiData = await gsiResponse.value.json().catch(() => []);
        const heartRailsStationNames = new Set(stationItems.map(station => station.name));
        const seenGsiStations = new Set();
        (Array.isArray(gsiData) ? gsiData : []).forEach(item => {
          const title = item?.properties?.title;
          const coordinates = item?.geometry?.coordinates;
          if (!title || !Array.isArray(coordinates)) return;
          const dataSource = String(item?.properties?.dataSource ?? '');
          if (dataSource === '1') {
            const isStation = title.endsWith('駅');
            const isInterchange = /(?:ＩＣ|IC|ＪＣＴ|JCT)$/.test(title);
            if (!isStation && !isInterchange) return;
            if (isStation && (heartRailsStationNames.has(title) || seenGsiStations.has(title))) return;
            if (isStation) seenGsiStations.add(title);
            const prefecture = getGsiPrefecture(item?.properties?.addressCode);
            gsiTransport.push({
              name: title,
              meta: prefecture || (isStation ? '駅' : 'IC・JCT'),
              lat: Number(coordinates[1]), lng: Number(coordinates[0]), type: 'place',
              group: 'transport', isStation
            });
          } else if (dataSource === '' || dataSource === '3') {
            gsiAddresses.push({
              name: title,
              meta: '地名・住所',
              lat: Number(coordinates[1]), lng: Number(coordinates[0]), type: 'place', group: 'address'
            });
          }
        });
        gsiTransport.sort((a, b) => Number(b.isStation) - Number(a.isStation));
      }
      const currentQuery = document.getElementById('map-a-search-input')?.value.trim() || '';
      if (sequence !== state.placeSequence || currentQuery !== querySnapshot || state.searchTab !== 'places') return;
      state.placeResults = [...stationItems, ...gsiTransport, ...gsiAddresses]
        .filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng));
      state.placeLoading = false;
      state.placeController = null;
      const gsiFailed = gsiResponse.status === 'rejected' || !gsiResponse.value.ok;
      const stationFailed = stationResponse.status === 'rejected' || !stationResponse.value.ok;
      if (!state.placeResults.length && gsiFailed && stationFailed) {
        state.placeError = '通信状況を確認して、もう一度お試しください。';
      }
      renderSearchResults();
    } catch (error) {
      if (error?.name === 'AbortError' || sequence !== state.placeSequence) return;
      state.placeLoading = false;
      state.placeController = null;
      state.placeError = '通信状況を確認して、もう一度お試しください。';
      renderSearchResults();
    }
  }

  function handleSearchResultClick(event) {
    if (event.target.closest('[data-map-a-photo-lookup]')) {
      startPhotoLookup();
      return;
    }
    const historyButton = event.target.closest('[data-map-a-search-history-use]');
    if (historyButton) {
      const query = state.shopSearchHistory[Number(historyButton.dataset.mapASearchHistoryUse)];
      const input = document.getElementById('map-a-search-input');
      if (query && input) {
        input.value = query;
        input.blur();
        renderSearchResults();
      }
      return;
    }
    const historyDeleteButton = event.target.closest('[data-map-a-search-history-delete]');
    if (historyDeleteButton) {
      const index = Number(historyDeleteButton.dataset.mapASearchHistoryDelete);
      if (Number.isInteger(index) && index >= 0 && index < state.shopSearchHistory.length) {
        state.shopSearchHistory.splice(index, 1);
        persistShopSearchHistory();
        renderSearchResults();
      }
      return;
    }
    if (event.target.closest('[data-map-a-search-history-clear]')) {
      state.shopSearchHistory = [];
      persistShopSearchHistory();
      renderSearchResults();
      return;
    }
    const sortButton = event.target.closest('[data-map-a-shop-search-sort]');
    if (sortButton) {
      const sort = sortButton.dataset.mapAShopSearchSort;
      if (sort === 'name' || sort === 'distance' || (sort === 'open' && state.shopSearchNewOnly)) {
        state.shopSearchSort = sort;
        if (state.searchResultMode?.active) {
          state.searchResultMode.sort = sort === 'distance' ? 'distance' : 'name';
          renderRail({ preserveActive: true });
        }
        renderSearchResults();
      }
      return;
    }
    if (event.target.closest('[data-map-a-search-lineage-open]')) {
      openSearchLineagePanel();
      return;
    }
    if (event.target.closest('[data-map-a-shop-search-new]')) {
      state.shopSearchNewOnly = !state.shopSearchNewOnly;
      state.shopSearchSort = state.shopSearchNewOnly ? 'open' : 'name';
      renderSearchResults();
      return;
    }
    if (event.target.closest('.map-a-result-more > summary')) return;
    if (event.target.closest('.map-a-result-menu a')) {
      closeSearchResultMenus();
      return;
    }
    closeSearchResultMenus();
    if (event.target.closest('[data-map-a-google-expand]')) {
      const query = document.getElementById('map-a-search-input')?.value.trim() || '';
      if (query.length < 2) return;
      state.googleExpanded = true;
      runGoogleSearch(query);
      return;
    }
    const detailButton = event.target.closest('[data-map-a-shop-detail]');
    if (detailButton) {
      window.showShopDetail?.(detailButton.dataset.mapAShopDetail);
      return;
    }
    const correctionButton = event.target.closest('[data-map-a-correction]');
    if (correctionButton) {
      window.reportShopInformation?.(correctionButton.dataset.mapACorrection);
      return;
    }
    const googleApplyButton = event.target.closest('[data-map-a-google-apply]');
    if (googleApplyButton) {
      const place = state.googleResults[Number(googleApplyButton.dataset.mapAGoogleApply)];
      if (place) window.openShopRequestForm?.({
        requestType: 'addition',
        shopName: place.name,
        address: place.address,
        googleMapsUrl: place.googleMapsUri,
        googlePlaceId: place.placeId,
        latitude: place.latitude,
        longitude: place.longitude,
        searchQuery: document.getElementById('map-a-search-input')?.value.trim() || ''
      });
      return;
    }
    if (event.target.closest('[data-map-a-manual-apply]')) {
      window.openShopRequestForm?.({
        requestType: 'addition',
        shopName: document.getElementById('map-a-search-input')?.value.trim() || '',
        searchQuery: document.getElementById('map-a-search-input')?.value.trim() || ''
      });
      return;
    }
    const shopRow = event.target.closest('[data-map-a-shop-result]');
    if (shopRow) {
      const shop = findShop(shopRow.dataset.mapAShopResult);
      if (!shop) return;
      const query = document.getElementById('map-a-search-input')?.value.trim() || '';
      if (!query && state.shopSearchCategories === null && !state.shopSearchNewOnly) return;
      closeSearchSurface();
      enterSearchResultMode(shop, query);
      const selectionToken = state.searchResultRenderToken;
      if (map && Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng))) {
        markProgrammaticMapMove('shop-search');
        // 店舗マーカーをカード領域で隠れない画面上の十字位置へ合わせる。
        setMapViewAtFocus(
          [Number(shop.lat), Number(shop.lng)],
          Math.max(13, map.getZoom()),
          { animate: true }
        );
      }
      setTimeout(() => {
        if (selectionToken !== state.searchResultRenderToken
          || !state.searchResultMode?.active
          || !state.searchResultMode.shopIds.some(id => String(id) === String(shop.id))) return;
        renderRail({ preserveActive: true, scrollToShopId: shop.id });
        selectMapShop(shop.id);
      }, 260);
      return;
    }
    const placeRow = event.target.closest('[data-map-a-place-result]');
    if (placeRow) {
      const place = state.placeResults[Number(placeRow.dataset.mapAPlaceResult)];
      if (!place) return;
      closeSearchSurface();
      markProgrammaticMapMove('place-search');
      applyLocationPoint(place.lat, place.lng, place.name);
      setTimeout(() => renderRail({ selectFirst: true, resetScroll: true }), 300);
    }
  }

  function closeSearchResultMenus(exceptDetails = null) {
    let closed = false;
    document.querySelectorAll('details.map-a-result-more[open]').forEach(details => {
      if (details === exceptDetails) return;
      details.removeAttribute('open');
      closed = true;
    });
    return closed;
  }

  function setMapUiMode(mode) {
    if (mode !== 'a' && mode !== 'classic') return;
    closeSearchSurface();
    closeAdjustPanel();
    releaseForcedShopMarker();
    if (mode === 'a') clearClassicSearchFilter();
    document.documentElement.dataset.mapUi = mode;
    syncSelectedShopIndicator(mode === 'a' ? state.activeShopId : null);
    try {
      localStorage.setItem(MODE_KEY, mode);
      const url = new URL(window.location.href);
      if (url.searchParams.has('mapUi')) {
        url.searchParams.delete('mapUi');
        history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch (_) {}
    syncMapUiSetting();
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
    if (map) {
      updateMarkers();
      renderShopList();
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, animate: false });
        if (mode === 'a') renderRail({ preserveActive: true });
      });
    }
  }

  function syncMapUiSetting() {
    document.querySelectorAll('[data-map-ui-mode]').forEach(button => {
      const active = button.dataset.mapUiMode === document.documentElement.dataset.mapUi;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setChecked(id, value) {
    const input = document.getElementById(id);
    if (input) input.checked = !!value;
  }

  function setRadio(name, value) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function getRadioValue(name, fallback) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  }

  function findShop(shopId) {
    return (Array.isArray(shops) ? shops : []).find(shop => String(shop.id) === String(shopId));
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('ja')
      .replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60))
      .replace(/[\s　・･_\-ー]+/g, '');
  }

  function formatDistance(distanceKm) {
    if (!Number.isFinite(distanceKm)) return '';
    if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)}m`;
    if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
    return `${Math.round(distanceKm)}km`;
  }

  function getMapDiscoveryUpdatedAtText() {
    const timestamp = window.dataUpdatedAt || '2026-07-19T00:00:00+09:00';
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? '更新日：未取得'
      : `更新日：${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  function syncMapDiscoveryUpdatedAt() {
    const text = getMapDiscoveryUpdatedAtText();
    document.querySelectorAll('#map-a-adjust-updated-at, #map-a-search-updated-at').forEach(element => {
      element.textContent = text;
    });
  }

  function escapeText(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeText(value).replace(/`/g, '&#96;');
  }

  window.setMapUiMode = setMapUiMode;
  window.getShopMapLabel = getShopMapLabel;
  window.syncMapShopLabels = syncMapShopLabels;
  window.syncMapDiscoveryUpdatedAt = syncMapDiscoveryUpdatedAt;
  syncMapDiscoveryUpdatedAt();
})();
