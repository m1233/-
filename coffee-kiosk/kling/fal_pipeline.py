#!/usr/bin/env python3
"""Kiosk film via fal.ai (Kling 3.0 Pro video + Nano Banana Pro keyframes).
The fal key is injected by the environment proxy for queue.fal.run - no key in code or env.

  python3 kling/fal_pipeline.py refs            # keyframe images  -> kling/out/img_*.jpg
  python3 kling/fal_pipeline.py clips [ids...]  # video clips      -> kling/out/clip_*.mp4
  python3 kling/fal_pipeline.py redo <id>       # regenerate one item
Resumable: finished items are recorded in kling/out/manifest.json.
"""
import base64, json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
MAN = os.path.join(OUT, 'manifest.json')
Q = 'https://queue.fal.run/'
IMG_MODEL = 'fal-ai/nano-banana-pro/edit'
VID_MODEL = 'fal-ai/kling-video/v3/pro/image-to-video'
UA = {'User-Agent': 'kiosk-film/1.0', 'Content-Type': 'application/json'}

STYLE = ('Photorealistic real footage, shot on iPhone, natural daylight, realistic textures, '
         'keep the exact same building design, signage, logo and colors.')
NEG = 'cartoon, CGI, 3D render, illustration, blurry, distorted hands, extra fingers, warped or changed text, new logos, watermark, low quality'
INTERIOR = ('the same small 3 by 5 meter drive-thru coffee kiosk interior: white walls, black quartz countertops, warm oak cabinets, '
            'charcoal subway-tile backsplash, grey porcelain floor, LED ceiling panels, black and white brand colors')

# ---------------------------------------------------------------- keyframe images
REFS = {
  'A': (['construction'], 'Show the same kiosk later in construction, from the exact same camera angle and same site: the steel frame is now closed '
        'with cement board wall panels, grey textured stucco is half applied, no signs yet, scaffolding and two workers still working, '
        'same metal canopy, same sky. Photorealistic photo.'),
  'B0': (['completed'], 'Create a photorealistic photo of the INTERIOR of this exact drive-thru coffee kiosk (3 by 5 meters), seen from the open staff '
         'door looking down the narrow aisle: white walls, black quartz countertops on both sides, warm oak cabinets, charcoal subway-tile '
         'backsplash, grey porcelain floor, LED ceiling panels, a backlit black sign with the same logo, two-group espresso machine and grinders '
         'on the left counter, the drive-thru service window with sliding glass on the right. Natural light, vertical 9:16 phone photo.'),
  'B1': (['B0', 'completed'], f'Photorealistic photo inside {INTERIOR}, same design as the first image. Camera looks at the back-left corner: two '
         'blenders, an under-counter stainless ice maker, colorful syrup bottles on floating oak shelves, white mugs.'),
  'B2': (['B0', 'completed'], f'Photorealistic photo inside {INTERIOR}, same design as the first image. Close view of the back counter: two black '
         'espresso grinders with beans in the hoppers and a stainless two-group espresso machine with portafilters and small white cups, '
         'the backlit logo sign above.'),
  'B3': (['B0', 'completed'], f'Photorealistic photo inside {INTERIOR}, same design as the first image. Camera looks at the right end of the back '
         'counter: stainless sink, pour-over station with gooseneck kettle, black batch brewer, a kitchen order display screen on the wall.'),
  'B4': (['B0', 'completed'], f'Photorealistic photo inside {INTERIOR}, same design as the first image. Camera looks at the end corner: tall '
         'glass-door display fridge with milk cartons and water bottles, wooden shelves stacked with coffee bags and paper cups, wall clock.'),
  'B5': (['B0', 'completed'], f'Photorealistic photo inside {INTERIOR}, same design as the first image. Camera looks at the front counter: glass '
         'pastry display with croissants and cakes, paper cup and lid station, syrup pump bottles, a POS tablet on a stand.'),
  'B6': (['B0', 'completed'], f'Photorealistic photo inside {INTERIOR}, same design as the first image. Camera faces the closed drive-thru service '
         'window with black frame and sliding glass, POS tablet on the counter below it, the drive-thru lane and pavers visible outside.'),
  'B7': (['B6', 'completed'], 'Same view and same interior as the first image, but the sliding window is now open and a white SUV has stopped at '
         'the window, the driver visible through the open car window, daylight. Photorealistic.'),
  'B8': (['B7'], 'Same view as the image: a barista hand passes a tray with an iced latte and a hot coffee cup through the open window to the '
         'driver of the white SUV, POS tablet shows a new order. Photorealistic.'),
}

# ---------------------------------------------------------------- clips (id, start, end, prompt)
CLIPS = [
  ('01', 'construction', None, 'Construction site in the morning: workers weld the steel frame of the small kiosk under the metal canopy, bright welding '
         'sparks, one worker on the scaffold, another carries steel profiles, slow handheld push-in'),
  ('02', 'construction', 'A', 'Construction time-lapse: workers close the steel frame with wall panels, grey stucco is sprayed onto the walls, '
         'gradual progress, the camera stays at the same angle'),
  ('03', 'A', 'completed', 'Construction time-lapse: black trim and dark glazing are fitted, the black signs and the round logo sign are installed '
         'one by one, the site becomes the finished drive-thru coffee kiosk, smooth gradual transformation'),
  ('04', 'completed', None, 'Slow cinematic push-in toward the finished coffee kiosk, clouds drifting, a gentle breeze, signs stay sharp'),
  ('05', 'completed', None, 'The camera glides slowly to the left along the drive-thru lane past the Order Here menu board, black and white curbs, '
         'interlocking pavers, speed bump'),
  ('06', 'completed', 'B0', 'First-person walk around the kiosk to the black staff door on the side, the door opens and the camera steps inside'),
  ('07', 'B0', 'B1', 'First-person POV inside the kiosk, the camera turns slowly to the left to the back corner with blenders and ice maker'),
  ('08', 'B1', 'B2', 'The camera moves slowly along the back counter to the espresso grinders and the two-group espresso machine'),
  ('09', 'B2', None, 'Close shot: espresso extracts from both group heads into small cups, steam rises from the steam wand, warm light, slow dolly'),
  ('10', 'B2', 'B3', 'The camera pans right along the back counter to the sink, pour-over station, batch brewer and order screen'),
  ('11', 'B3', 'B4', 'The camera turns to the end corner with the glass-door display fridge and the shelves of coffee bags'),
  ('12', 'B4', 'B5', 'The camera turns around to the front counter with the pastry display, cup station and POS tablet'),
  ('13', 'B5', 'B6', 'The camera pans to the drive-thru service window, showing the whole compact, organized interior on the way'),
  ('14', 'B6', 'B7', 'The barista slides open the drive-thru window and a white SUV slowly pulls up and stops at the window'),
  ('15', 'B7', None, 'The POS tablet shows a new order, the barista pours milk over ice and espresso into a clear cup and prepares a hot latte'),
  ('16', 'B7', 'B8', 'The barista hands the iced latte and the hot coffee through the window to the driver, friendly exchange'),
  ('17', 'B8', None, 'The driver takes the drinks, says thanks, and the white SUV drives away slowly, sunlight on the window counter'),
]

def load():
    return json.load(open(MAN)) if os.path.exists(MAN) else {}
def save(m): json.dump(m, open(MAN, 'w'), indent=1)

def data_uri(path):
    return 'data:image/jpeg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
def img_path(key):
    return {'construction': os.path.join(HERE, 'kiosk_construction.jpg'), 'completed': os.path.join(HERE, 'kiosk_completed_clean.jpg')}.get(key, os.path.join(OUT, f'img_{key}.jpg'))

def http(method, url, body=None, tries=5):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=UA, method=method)
            with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:500]
            if e.code in (401, 403, 422, 400): raise RuntimeError(f'{e.code} {msg}')
            print('  http', e.code, msg[:120]); time.sleep(5 * (k + 1))
        except Exception as e:
            print('  net', e); time.sleep(5 * (k + 1))
    raise RuntimeError('request failed: ' + url)

def run(model, payload, label):
    sub = http('POST', Q + model, payload)
    st_url, res_url = sub['status_url'], sub['response_url']
    print(f'[{label}] queued {sub["request_id"]}'); t0 = time.time()
    while True:
        time.sleep(8); st = http('GET', st_url)
        if st.get('status') == 'COMPLETED': break
        if st.get('status') not in ('IN_QUEUE', 'IN_PROGRESS'): raise RuntimeError(f'{label}: {st}')
    res = http('GET', res_url); print(f'[{label}] done in {time.time() - t0:.0f}s'); return res

def download(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': 'kiosk-film/1.0'})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, 'wb') as f: f.write(r.read())

def make_ref(key):
    srcs, prompt = REFS[key]
    res = run(IMG_MODEL, {'prompt': prompt, 'image_urls': [data_uri(img_path(s)) for s in srcs], 'aspect_ratio': '9:16',
                          'resolution': '2K', 'output_format': 'jpeg', 'num_images': 1}, 'img ' + key)
    download(res['images'][0]['url'], img_path(key)); return res['images'][0]['url']

def make_clip(cid):
    _, s, e, prompt = next(c for c in CLIPS if c[0] == cid)
    p = {'prompt': f'{prompt}. {STYLE}', 'negative_prompt': NEG, 'start_image_url': data_uri(img_path(s)), 'duration': '10',
         'generate_audio': False, 'cfg_scale': 0.6}
    if e: p['end_image_url'] = data_uri(img_path(e))
    res = run(VID_MODEL, p, 'clip ' + cid)
    download(res['video']['url'], os.path.join(OUT, f'clip_{cid}.mp4')); return res['video']['url']

def refs(keys=None):
    m = load(); order = keys or ['A', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8']
    # dependency waves
    for wave in (['A', 'B0'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'], ['B7'], ['B8']):
        todo = [k for k in wave if k in order and ('img_' + k) not in m]
        with ThreadPoolExecutor(6) as ex:
            for k, url in zip(todo, ex.map(make_ref, todo)): m['img_' + k] = url; save(m)

def clips(ids=None):
    m = load(); todo = [c[0] for c in CLIPS if (not ids or c[0] in ids) and ('clip_' + c[0]) not in m]
    with ThreadPoolExecutor(4) as ex:
        futs = {cid: ex.submit(make_clip, cid) for cid in todo}
        for cid, f in futs.items():
            try: m['clip_' + cid] = f.result(); save(m)
            except Exception as err: print(f'[clip {cid}] FAILED: {err}')

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'refs'
    if cmd == 'refs': refs(sys.argv[2:] or None)
    elif cmd == 'clips': clips(sys.argv[2:] or None)
    elif cmd == 'redo':
        m = load()
        for k in sys.argv[2:]: m.pop(('clip_' if k[0].isdigit() else 'img_') + k, None)
        save(m); [refs([k]) if not k[0].isdigit() else clips([k]) for k in sys.argv[2:]]
