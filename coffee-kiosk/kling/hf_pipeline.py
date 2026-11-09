#!/usr/bin/env python3
"""Kiosk film via the Higgsfield Cloud API (api.higgsfield.ai).
Keyframes: marketing-studio/image (high, 2k, 9:16). Clips: Kling 3.0 Pro image-to-video, 10 s, sound off.
The API key is injected by the environment proxy - no key in code or env.
Shot plan (REFS, CLIPS, STYLE, NEG) is reused verbatim from fal_pipeline.py.

  python3 kling/hf_pipeline.py refs [keys...]   # keyframes -> kling/out/img_*.jpg
  python3 kling/hf_pipeline.py clips [ids...]   # clips     -> kling/out/clip_*.mp4
  python3 kling/hf_pipeline.py redo <id...>     # regenerate items
Resumable: finished items are recorded in kling/out/hf_manifest.json.
"""
import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from fal_pipeline import REFS, CLIPS, STYLE, NEG, HERE, OUT, img_path, download

API = 'https://api.higgsfield.ai'
IMG_MODEL = 'marketing-studio/image'
VID_MODEL = 'kling-video/v3.0/pro/image-to-video'
MAN = os.path.join(OUT, 'hf_manifest.json')
HDR = {'Content-Type': 'application/json', 'User-Agent': 'kiosk-film/1.0'}
LOG = os.path.join(OUT, 'hf_costs.jsonl')

def load(): return json.load(open(MAN)) if os.path.exists(MAN) else {}
def save(m): json.dump(m, open(MAN, 'w'), indent=1)

def http(method, path, body=None, tries=5):
    url = path if path.startswith('http') else API + '/' + path.lstrip('/')
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=HDR, method=method)
            with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:500]
            if e.code in (400, 401, 402, 403, 404, 422): raise RuntimeError(f'{e.code} {msg}')
            print('  http', e.code, msg[:120], flush=True); time.sleep(5 * (k + 1))
        except Exception as e:
            print('  net', e, flush=True); time.sleep(5 * (k + 1))
    raise RuntimeError('request failed: ' + url)

def upload(path):
    u = http('POST', 'files/generate-upload-url', {'content_type': 'image/jpeg'})
    req = urllib.request.Request(u['upload_url'], data=open(path, 'rb').read(),
                                 headers=u.get('upload_headers') or {'Content-Type': 'image/jpeg'}, method='PUT')
    urllib.request.urlopen(req, timeout=300).read()
    return u['public_url']

def url_of(key, m):
    if 'up_' + key not in m:
        m['up_' + key] = upload(img_path(key)); save(m)
    return m['up_' + key]

def run(model, payload, label):
    try: est = http('POST', 'estimate/' + model, payload).get('usd')
    except Exception: est = None
    sub = http('POST', model, payload)
    print(f'[{label}] queued {sub["request_id"]} est ${est}', flush=True); t0 = time.time()
    while True:
        time.sleep(10); st = http('GET', sub['status_url'])
        s = st.get('status')
        if s == 'completed': break
        if s not in ('queued', 'in_progress'): raise RuntimeError(f'{label}: {json.dumps(st)[:400]}')
    with open(LOG, 'a') as f: f.write(json.dumps({'label': label, 'model': model, 'usd': est, 'id': sub['request_id']}) + '\n')
    print(f'[{label}] done in {time.time() - t0:.0f}s', flush=True); return st

def make_ref(key, m):
    srcs, prompt = REFS[key]
    st = run(IMG_MODEL, {'prompt': prompt + ' ' + STYLE, 'image_urls': [url_of(s, m) for s in srcs], 'quality': 'high',
                         'resolution': '2k', 'aspect_ratio': '9:16'}, 'img ' + key)
    u = st['images'][0]['url']; download(u, img_path(key)); return u

def make_clip(cid, m):
    _, s, e, prompt = next(c for c in CLIPS if c[0] == cid)
    p = {'prompt': f'{prompt}. {STYLE}', 'image_url': url_of(s, m), 'duration': 10, 'sound': 'off', 'cfg_scale': 0.6}
    if e: p['last_image_url'] = url_of(e, m)
    st = run(VID_MODEL, p, 'clip ' + cid)
    u = st['video']['url']; download(u, os.path.join(OUT, f'clip_{cid}.mp4')); return u

def refs(keys=None):
    m = load(); order = keys or list(REFS)
    for wave in (['A', 'B0'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'], ['B7'], ['B8']):
        todo = [k for k in wave if k in order and ('img_' + k) not in m]
        with ThreadPoolExecutor(6) as ex:
            futs = {k: ex.submit(make_ref, k, m) for k in todo}
            for k, f in futs.items():
                try: m['img_' + k] = f.result(); m.pop('up_' + k, None); save(m)
                except Exception as err: print(f'[img {k}] FAILED: {err}', flush=True)

def clips(ids=None):
    m = load(); todo = [c[0] for c in CLIPS if (not ids or c[0] in ids) and ('clip_' + c[0]) not in m]
    for c in CLIPS:  # upload all needed frames first (single-threaded, avoids manifest races)
        if c[0] in todo: url_of(c[1], m); c[2] and url_of(c[2], m)
    with ThreadPoolExecutor(6) as ex:
        futs = {cid: ex.submit(make_clip, cid, m) for cid in todo}
        for cid, f in futs.items():
            try: m['clip_' + cid] = f.result(); save(m)
            except Exception as err: print(f'[clip {cid}] FAILED: {err}', flush=True)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'refs'; args = sys.argv[2:]
    if cmd == 'refs': refs(args or None)
    elif cmd == 'clips': clips(args or None)
    elif cmd == 'redo':
        m = load()
        for k in args:
            if k[0].isdigit(): m.pop('clip_' + k, None)
            else: m.pop('img_' + k, None); m.pop('up_' + k, None)
        save(m)
        imgs = [k for k in args if not k[0].isdigit()]; vids = [k for k in args if k[0].isdigit()]
        if imgs: refs(imgs)
        if vids: clips(vids)
