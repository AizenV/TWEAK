const { contextBridge, ipcRenderer } = require('electron');
const i = (c, ...a) => ipcRenderer.invoke(c, ...a);
contextBridge.exposeInMainWorld('api', {
  list: () => i('tweaks:list'), set: (id, on) => i('tweaks:set', id, on), resetAll: () => i('tweaks:resetall'),
  sys: () => i('sys:info'), chGet: () => i('ch:get'), chDisplays: () => i('ch:displays'), chSet: (c) => i('ch:set', c), sysDetails: () => i('sys:details'), sysLive: () => i('sys:live'), cleanScan: () => i('clean:scan'), cleanRun: (ids) => i('clean:run', ids), flushDns: () => i('net:flushdns'),
  rpList: () => i('rp:list'), rpCreate: (n) => i('rp:create', n), rpOpen: () => i('rp:open'),
  prCfg: () => i('pr:cfg'), prSetUrl: (u) => i('pr:setUrl', u), prList: () => i('pr:list'), prPick: (c) => i('pr:pick', c), prInstall: (it) => i('pr:install', it), prOpenFolder: (c) => i('pr:openFolder', c),
  fvList: () => i('fv:list'), fvSet: (id, on) => i('fv:set', id, on), fvSizes: () => i('fvc:sizes'), fvClean: (k) => i('fvc:clean', k),
  fvBloatScan: (m) => i('fvc:bloatScan', m), fvBloatRun: (l, m) => i('fvc:bloatRun', l, m), fvExt: (k) => i('fvc:ext', k),
  gmList: () => i('gm:list'), gmSet: (id, k, on) => i('gm:set', id, k, on), gmPickExe: (id) => i('gm:pickExe', id), gmFso: (id, on) => i('gm:fso', id, on), gmPickCover: (id) => i('gm:pickCover', id), gmClearCover: (id) => i('gm:clearCover', id), gmAdd: (e) => i('gm:add', e), gmRemove: (id) => i('gm:remove', id),
  licStatus: () => i('lic:status'), licActivate: (k) => i('lic:activate', k), licCancel: () => i('lic:cancel'), licRefresh: () => i('lic:refresh'), licLogout: () => i('lic:logout'), licHwid: () => i('lic:hwid'),
  fixList: () => i('fix:list'), fixRun: (id) => i('fix:run', id), fixAll: () => i('fix:all'),
});
