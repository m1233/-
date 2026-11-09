# Photoreal build of the 3 x 5 m drive-thru coffee kiosk for Blender 4.2 (Cycles).
#   blender -b --python blender/build_scene.py -- <assets_dir> <out.blend> [fps]
# Coordinates in helper calls use the same convention as the web preview (x, y-up, z):
#   three (x, y, z)  ->  blender (x, -z, y)
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ASSETS = argv[0]
OUT_BLEND = argv[1]
FPS = int(argv[2]) if len(argv) > 2 else 30
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEXD = os.path.join(ASSETS, 'tex')
MODD = os.path.join(ASSETS, 'models')
SIGN = os.path.join(ROOT, 'build', 'tex')
DUR = 60.0

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
col = scn.collection

def B(x, y, z): return Vector((x, -z, y))

# ------------------------------------------------------------------ materials
_img = {}
def img(path, non_color=False):
    if path not in _img:
        im = bpy.data.images.load(path, check_existing=True)
        if non_color: im.colorspace_settings.name = 'Non-Color'
        _img[path] = im
    return _img[path]

def new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    return m, nt, bsdf

def pbr(name, tex=None, size=1.0, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, tint=None, bright=1.0, coat=0.0,
        normal_strength=1.0, rough_mul=1.0, aniso=0.0, spec=0.5, noise_bump=0.0, noise_scale=300.0):
    m, nt, bsdf = new_mat(name); N, L = nt.nodes, nt.links
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Specular IOR Level'].default_value = spec
    if aniso: bsdf.inputs['Anisotropic'].default_value = aniso
    if tex:
        uv = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / size, 1 / size, 1)
        L.new(uv.outputs['UV'], mp.inputs['Vector'])
        d = N.new('ShaderNodeTexImage'); d.image = img(os.path.join(TEXD, f'{tex}_diff.jpg')); L.new(mp.outputs[0], d.inputs[0])
        c = d.outputs['Color']
        if tint is not None or bright != 1.0:
            mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
            L.new(c, mix.inputs[6]); t = tint or (1, 1, 1); mix.inputs[7].default_value = (t[0] * bright, t[1] * bright, t[2] * bright, 1)
            c = mix.outputs[2]
        L.new(c, bsdf.inputs['Base Color'])
        r = N.new('ShaderNodeTexImage'); r.image = img(os.path.join(TEXD, f'{tex}_rough.jpg'), True); L.new(mp.outputs[0], r.inputs[0])
        if rough_mul != 1.0:
            mm = N.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = rough_mul; L.new(r.outputs[0], mm.inputs[0]); L.new(mm.outputs[0], bsdf.inputs['Roughness'])
        else: L.new(r.outputs[0], bsdf.inputs['Roughness'])
        n = N.new('ShaderNodeTexImage'); n.image = img(os.path.join(TEXD, f'{tex}_nor.jpg'), True); L.new(mp.outputs[0], n.inputs[0])
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal_strength
        L.new(n.outputs[0], nm.inputs['Color']); L.new(nm.outputs[0], bsdf.inputs['Normal'])
    elif noise_bump:
        tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = noise_scale; nz.inputs['Detail'].default_value = 4
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = noise_bump; bp.inputs['Distance'].default_value = .002
        L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs[0], bsdf.inputs['Normal'])
    return m

def glass(name, color=(1, 1, 1), rough=0.0, tint_alpha=1.0, dark=False):
    m, nt, bsdf = new_mat(name); N, L = nt.nodes, nt.links
    out = N['Material Output']
    bsdf.inputs['Base Color'].default_value = (*color, 1); bsdf.inputs['Transmission Weight'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['IOR'].default_value = 1.5
    # thin glass: transparent for shadow rays so light passes the panes
    lp = N.new('ShaderNodeLightPath'); tr = N.new('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (*color, 1)
    mix = N.new('ShaderNodeMixShader'); L.new(lp.outputs['Is Shadow Ray'], mix.inputs[0])
    L.new(bsdf.outputs[0], mix.inputs[1]); L.new(tr.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
    return m

def emit(name, color=(1, 1, 1), strength=5.0):
    m, nt, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = (*color, 1); bsdf.inputs['Emission Color'].default_value = (*color, 1)
    bsdf.inputs['Emission Strength'].default_value = strength; return m

def image_mat(name, path, emission=0.0, alpha=False, rough=0.4, metal=0.0, circle=False, base=None):
    m, nt, bsdf = new_mat(name); N, L = nt.nodes, nt.links; out = N['Material Output']
    t = N.new('ShaderNodeTexImage'); t.image = img(path); t.interpolation = 'Cubic'
    L.new(t.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = metal
    if emission:
        L.new(t.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = emission
    a = None
    if alpha: a = t.outputs['Alpha']
    if circle:
        uv = N.new('ShaderNodeTexCoord'); sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = (.5, .5, 0)
        ln = N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = .5
        L.new(uv.outputs['UV'], sub.inputs[0]); L.new(sub.outputs[0], ln.inputs[0]); L.new(ln.outputs['Value'], lt.inputs[0]); a = lt.outputs[0]
    if a is not None:
        tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader')
        L.new(a, mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(bsdf.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
    return m

M = {}
def stucco_mat(name, base=(.56, .555, .54)):
    m = pbr(name, 'grey_plaster_02', size=.6, normal_strength=2.5); nt = m.node_tree; N, L = nt.nodes, nt.links; bsdf = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); vor = N.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 260; L.new(tc.outputs['Object'], vor.inputs['Vector'])
    ramp_ = N.new('ShaderNodeValToRGB'); ramp_.color_ramp.elements[0].position = .0; ramp_.color_ramp.elements[0].color = (.08, .075, .07, 1)
    ramp_.color_ramp.elements[1].position = .09; ramp_.color_ramp.elements[1].color = (*base, 1); L.new(vor.outputs['Distance'], ramp_.inputs[0])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3; L.new(tc.outputs['Object'], nz.inputs['Vector'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; L.new(nz.outputs['Fac'], mx.inputs[0]); mx.inputs[0].default_value = .15
    L.new(ramp_.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = (.92, .92, .92, 1); mx.inputs[0].default_value = .25
    L.new(mx.outputs[2], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .92
    for l_ in list(L):
        if l_.to_node == bsdf and l_.to_socket.name == 'Roughness': L.remove(l_)
    return m
M['stucco'] = stucco_mat('stucco')
M['wallIn'] = pbr('wall_paint', color=(.86, .84, .80), rough=.75, noise_bump=.15, noise_scale=180)
M['black'] = pbr('powder_black', color=(.018, .018, .018), rough=.38, coat=.3, noise_bump=.05)
M['matteBlack'] = pbr('matte_black', color=(.025, .025, .025), rough=.7)
M['steel'] = pbr('steel', color=(.85, .86, .87), metal=1, rough=.22, aniso=.6)
M['brushed'] = pbr('brushed', color=(.75, .76, .77), metal=1, rough=.33, aniso=.8)
M['chrome'] = pbr('chrome', color=(.95, .95, .95), metal=1, rough=.04)
M['quartz'] = pbr('quartz', color=(.03, .03, .032), rough=.12, coat=.4, noise_bump=.03)
M['oak'] = pbr('oak', 'mocha_oak_veneer', size=1.2, tint=(1.15, 1.0, .85), bright=1.1)
M['tile'] = pbr('floor_tile', 'large_grey_tiles', size=1.6, bright=.9, rough_mul=.7)
M['subway'] = pbr('backsplash', 'long_white_tiles', size=.9, tint=(.11, .11, .115), bright=1.0, rough_mul=.35, normal_strength=1.5)
M['paver'] = pbr('pavers', 'herringbone_pavement_03', size=2.2, tint=(1, 1, 1.02), bright=1.9, normal_strength=1.4)
M['grass'] = pbr('grass', 'leafy_grass', size=1.5, tint=(.55, 1.0, .35), bright=1.25)
M['concrete'] = pbr('concrete', 'concrete_pavement', size=2.0, bright=1.1)
M['asphalt'] = pbr('asphalt', 'asphalt_02', size=3.0, bright=.9)
M['glass'] = glass('glass', color=(.94, .97, .96))
M['darkGlass'] = glass('dark_glass', color=(.12, .14, .15))
M['clear'] = glass('clear_plastic', color=(.98, .98, .98), rough=.02)
M['white'] = pbr('white_plastic', color=(.85, .85, .83), rough=.35)
M['ceramic'] = pbr('ceramic', color=(.9, .9, .88), rough=.08, coat=.5)
M['paperCup'] = pbr('paper_cup', color=(.86, .82, .74), rough=.6)
M['kraft'] = pbr('kraft', color=(.42, .29, .17), rough=.85, noise_bump=.3, noise_scale=90)
M['bagBlack'] = pbr('bag_black', color=(.03, .03, .03), rough=.55, noise_bump=.3, noise_scale=90)
M['bagGold'] = pbr('bag_gold', color=(.55, .38, .2), rough=.35, metal=.5, noise_bump=.2, noise_scale=90)
M['beans'] = pbr('beans', color=(.09, .045, .02), rough=.45, noise_bump=1.0, noise_scale=60)
M['coffee'] = pbr('coffee', color=(.12, .06, .03), rough=.15)
M['red'] = pbr('red', color=(.55, .02, .02), rough=.3, coat=.5)
M['rubber'] = pbr('rubber', color=(.02, .02, .02), rough=.85)
M['carPaint'] = pbr('car_paint', color=(.82, .83, .84), rough=.25, metal=.4, coat=1.0)
M['tire'] = pbr('tire', color=(.018, .018, .018), rough=.9, noise_bump=.2)
M['panel'] = emit('led_panel', (1, .94, .86), 5)
M['warmLed'] = emit('warm_led', (1, .78, .5), 12)
M['fridgeLight'] = emit('fridge_light', (.9, .95, 1.0), 3.5)
M['screenBlue'] = emit('screen_blue', (.35, .7, 1.0), 2)
M['acLed'] = emit('ac_led', (.3, .8, 1.0), 4)
M['headlight'] = emit('headlight', (1, 1, 1), 6)
M['taillight'] = emit('taillight', (1, .05, .03), 3)
M['skin'] = pbr('skin', color=(.42, .25, .17), rough=.55)
M['thobe'] = pbr('thobe', color=(.85, .85, .83), rough=.8)

def curb_mat():
    m, nt, bsdf = new_mat('curb'); N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Generated' if False else 'Object'], sep.inputs[0])
    add = N.new('ShaderNodeMath'); add.operation = 'ADD'; L.new(sep.outputs[0], add.inputs[0]); L.new(sep.outputs[1], add.inputs[1])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 2.0; L.new(add.outputs[0], mul.inputs[0])
    fl = N.new('ShaderNodeMath'); fl.operation = 'FLOOR'; L.new(mul.outputs[0], fl.inputs[0])
    md = N.new('ShaderNodeMath'); md.operation = 'FLOORED_MODULO'; md.inputs[1].default_value = 2; L.new(fl.outputs[0], md.inputs[0])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; L.new(md.outputs[0], mix.inputs[0]); mix.inputs[6].default_value = (.02, .02, .02, 1); mix.inputs[7].default_value = (.75, .75, .72, 1)
    L.new(mix.outputs[2], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .75
    return m
M['curb'] = curb_mat()

def bump_mat():
    m, nt, bsdf = new_mat('speed_bump'); N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 3.0; L.new(sep.outputs[1], mul.inputs[0])
    fl = N.new('ShaderNodeMath'); fl.operation = 'FLOOR'; L.new(mul.outputs[0], fl.inputs[0])
    md = N.new('ShaderNodeMath'); md.operation = 'FLOORED_MODULO'; md.inputs[1].default_value = 2; L.new(fl.outputs[0], md.inputs[0])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; L.new(md.outputs[0], mix.inputs[0]); mix.inputs[6].default_value = (.015, .015, .015, 1); mix.inputs[7].default_value = (.75, .5, .02, 1)
    L.new(mix.outputs[2], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .6
    return m
M['bump'] = bump_mat()

# ------------------------------------------------------------------ geometry helpers
def link(ob, parent=None):
    col.objects.link(ob)
    if parent is not None: ob.parent = parent
    return ob

def box_uv(bm, s=1.0):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            co = lp.vert.co
            if ax == 0: u, v = co.y, co.z
            elif ax == 1: u, v = co.x, co.z
            else: u, v = co.x, co.y
            lp[uvl].uv = (u / s, v / s)

def mk_obj(name, bm, mat, parent=None, smooth=False, bevel=0.0, seg=2):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if isinstance(mat, list):
        for mm in mat: me.materials.append(mm)
    else: me.materials.append(mat)
    if smooth:
        for p in me.polygons: p.use_smooth = abs(p.normal.z) < .9
    ob = bpy.data.objects.new(name, me); link(ob, parent)
    if bevel:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.harden_normals = True
        for p in me.polygons: p.use_smooth = True
    return ob

def cube_bm(sx, sy, sz):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    bm.normal_update(); return bm

def blk(x0, x1, y0, y1, z0, z1, mat, parent=None, bevel=0.0, s=1.0, name='blk', face_mats=None):
    """axis-aligned block by three-style extents"""
    bm = cube_bm(x1 - x0, z1 - z0, y1 - y0); box_uv(bm, s)
    if face_mats:  # dict: '+x','-x','+y','-y','+z','-z' (three axes) -> material index
        for f in bm.faces:
            n = f.normal; key = None
            if n.x > .9: key = '+x'
            elif n.x < -.9: key = '-x'
            elif n.z > .9: key = '+y'
            elif n.z < -.9: key = '-y'
            elif n.y < -.9: key = '+z'
            elif n.y > .9: key = '-z'
            f.material_index = face_mats.get(key, 0)
    ob = mk_obj(name, bm, mat, parent, bevel=bevel)
    ob.location = B((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    return ob

def box(w, h, d, mat, x, y, z, parent=None, r=0.0, name='box'):
    bm = cube_bm(w, d, h); box_uv(bm)
    ob = mk_obj(name, bm, mat, parent, bevel=r, seg=3 if r else 2); ob.location = B(x, y, z); return ob

def cyl(rt, rb, h, mat, x, y, z, parent=None, seg=32, name='cyl', bevel=0.0, axis='y'):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=rb, radius2=rt, depth=h); box_uv(bm, .3)
    ob = mk_obj(name, bm, mat, parent, smooth=True, bevel=bevel); ob.location = B(x, y, z)
    if axis == 'x': ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': ob.rotation_euler = (math.pi / 2, 0, 0)
    return ob

def torus(R, r, mat, x, y, z, parent=None, arc=2 * math.pi, rot=(0, 0, 0), name='torus'):
    bm = bmesh.new(); segs = 24; rs = 10; rings = []
    full = abs(arc - 2 * math.pi) < 1e-3
    n_ring = segs if full else segs + 1
    for i in range(n_ring):
        a = arc * i / segs; ring = []
        for j in range(rs):
            b = 2 * math.pi * j / rs
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        rings.append(ring)
    for i in range(segs):
        r0 = rings[i]; r1 = rings[(i + 1) % n_ring]
        for j in range(rs): bm.faces.new((r0[j], r1[j], r1[(j + 1) % rs], r0[(j + 1) % rs]))
    bm.normal_update(); ob = mk_obj(name, bm, mat, parent); ob.location = B(x, y, z); ob.rotation_euler = rot
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def plane(w, h, mat, x, y, z, ry=0.0, parent=None, name='plane'):
    bm = bmesh.new(); vs = [bm.verts.new(v) for v in ((-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2))]
    f = bm.faces.new(vs); uvl = bm.loops.layers.uv.verify()
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uvl].uv = uv
    ob = mk_obj(name, bm, mat, parent); ob.location = B(x, y, z); ob.rotation_euler = (0, 0, ry); return ob

def group(x=0, y=0, z=0, ry=0.0, parent=None, name='grp'):
    e = bpy.data.objects.new(name, None); link(e, parent); e.location = B(x, y, z); e.rotation_euler = (0, 0, ry); return e

def lettering(path, w, h, x, y, z, ry, depth=.03, layers=6, name='letters', emission=0.0):
    """stacked alpha planes = physical 3D letters standing off the wall (casts real shadows)"""
    m = image_mat(name, path, alpha=True, rough=.35, emission=emission)
    n = Vector((-math.sin(ry), -math.cos(ry), 0))  # plane normal (blender) after rotation
    for i in range(layers):
        ob = plane(w, h, m, x, y, z, ry, name=f'{name}_{i}')
        ob.location += n * (.004 + depth * i / max(1, layers - 1))
    return m

# ------------------------------------------------------------------ world (real HDRI sky, sun aligned)
world = bpy.data.worlds.new('sky'); scn.world = world; world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
env = wn.new('ShaderNodeTexEnvironment'); env.image = img(os.path.join(TEXD, 'sky_4k.hdr'))
tc = wn.new('ShaderNodeTexCoord'); mp = wn.new('ShaderNodeMapping'); wl.new(tc.outputs['Generated'], mp.inputs[0]); wl.new(mp.outputs[0], env.inputs[0])
wl.new(env.outputs[0], wn['Background'].inputs[0]); wn['Background'].inputs[1].default_value = 1.0
# find the sun in the HDRI and rotate the sky so sunlight comes from the front-left, like the reference photo
im = env.image; W_, H_ = im.size; px = np.empty(W_ * H_ * 4, dtype=np.float32); im.pixels.foreach_get(px)
lum = px.reshape(H_, W_, 4)[..., :3].sum(-1); iy, ix = np.unravel_index(np.argmax(lum), lum.shape)
u = (ix + .5) / W_; v = (iy + .5) / H_
alpha_img = math.pi - 2 * math.pi * (u - .5); elev = (v - .5) * math.pi
target = B(-9, 0, 12); alpha_t = math.atan2(target.y, target.x)
mp.inputs['Rotation'].default_value = (0, 0, alpha_img - alpha_t)
print('HDRI sun at u=%.3f v=%.3f elevation=%.1f deg' % (u, v, math.degrees(elev)))

# ================================================================== ARCHITECTURE  (outer 5.0 x 3.0 m)
X0, X1, Z0, Z1, T, HT, CEIL = -2.5, 2.5, -1.5, 1.5, .12, 3.2, 2.9
xi0, xi1, zi0, zi1 = X0 + T, X1 - T, Z0 + T, Z1 - T
S, Wi = M['stucco'], M['wallIn']
def wall(x0, x1, y0, y1, z0, z1, inner_face):
    return blk(x0, x1, y0, y1, z0, z1, [S, Wi], face_mats={inner_face: 1}, name='wall')
WX0, WX1, WY0, WY1 = .2, 2.2, 1.0, 2.2
wall(X0, WX0, 0, HT, Z1 - T, Z1, '-z'); wall(WX1, X1, 0, HT, Z1 - T, Z1, '-z')
wall(WX0, WX1, 0, WY0, Z1 - T, Z1, '-z'); wall(WX0, WX1, WY1, HT, Z1 - T, Z1, '-z')
wall(X0, X1, 0, HT, Z0, Z0 + T, '+z')
DZ0, DZ1, DH = -.45, .45, 2.2
wall(X0, X0 + T, 0, HT, zi0, DZ0, '+x'); wall(X0, X0 + T, 0, HT, DZ1, zi1, '+x'); wall(X0, X0 + T, DH, HT, DZ0, DZ1, '+x')
wall(X1 - T, X1, 0, HT, zi0, zi1, '-x')
blk(xi0, xi1, CEIL, HT, zi0, zi1, [S, Wi], face_mats={'-y': 1}, name='roof')
blk(X0 - .04, X1 + .04, HT, HT + .14, Z0 - .04, Z1 + .04, M['black'], bevel=.004, name='roof_cap')
blk(X0 - .02, X1 + .02, 0, .12, Z0 - .02, Z1 + .02, M['matteBlack'], name='plinth')
blk(xi0, xi1, 0, .015, zi0, zi1, M['tile'], name='floor')
# front black cladding + dark glazing band
blk(0, X1 + .03, 2.2, 2.45, Z1, Z1 + .04, M['black'], bevel=.003)
blk(0, WX0, .12, 2.45, Z1, Z1 + .04, M['black'], bevel=.003)
blk(WX1, X1 + .03, .12, 2.45, Z1, Z1 + .04, M['black'], bevel=.003)
blk(X1, X1 + .03, .12, 2.45, Z1 - 1.0, Z1, M['black'])
blk(WX0, WX1, .12, WY0 - .05, Z1, Z1 + .03, M['darkGlass'], name='spandrel_glass')
blk(WX0, WX1, .12, WY0 - .05, Z1 - .001, Z1, M['matteBlack'])
blk(WX0 - .05, WX1 + .05, WY0 - .05, WY0, Z1, Z1 + .32, M['brushed'], bevel=.004, name='handoff_ledge')
for a in (blk(WX0, WX1, WY0, WY0 + .03, Z1 - T, Z1, M['black']), blk(WX0, WX1, WY1 - .04, WY1, Z1 - T, Z1, M['black']),
          blk(WX0, WX0 + .04, WY0, WY1, Z1 - T, Z1, M['black']), blk(WX1 - .04, WX1, WY0, WY1, Z1 - T, Z1, M['black'])): pass
blk(1.2, WX1 - .04, WY0 + .03, WY1 - .04, Z1 - .046, Z1 - .04, M['glass'], name='fixed_pane')
blk(1.18, 1.22, WY0 + .03, WY1 - .04, Z1 - .06, Z1 - .02, M['black'])
slide = group(name='slide_pane')
blk(WX0 + .04, 1.22, WY0 + .03, WY1 - .04, Z1 - .083, Z1 - .077, M['glass'], parent=slide)
blk(WX0 + .04, WX0 + .08, WY0 + .03, WY1 - .04, Z1 - .1, Z1 - .06, M['black'], parent=slide)
blk(1.18, 1.22, WY0 + .03, WY1 - .04, Z1 - .1, Z1 - .06, M['black'], parent=slide)
blk(WX0 + .04, 1.22, WY0 + .03, WY0 + .06, Z1 - .1, Z1 - .06, M['black'], parent=slide)
blk(WX0 + .04, 1.22, WY1 - .07, WY1 - .04, Z1 - .1, Z1 - .06, M['black'], parent=slide)
blk(WX0 + .1, WX0 + .13, 1.45, 1.75, Z1 - .13, Z1 - .1, M['steel'], parent=slide, bevel=.005)
# door (hinge on the outer face, opens outward)
door = group(X0 - .01, 0, DZ0, name='door')
blk(-.05, 0, 0, DH - .01, .01, .89, M['black'], parent=door, bevel=.004)
blk(-.11, -.05, 1.0, 1.04, .74, .8, M['steel'], parent=door); blk(-.11, -.08, .65, 1.4, .76, .79, M['steel'], parent=door, bevel=.006)
blk(0, .06, 1.02, 1.05, .2, .8, M['steel'], parent=door, bevel=.006)
blk(X0 - .03, X0, 0, DH + .03, DZ0 - .04, DZ0, M['black']); blk(X0 - .03, X0, 0, DH + .03, DZ1, DZ1 + .04, M['black']); blk(X0 - .03, X0, DH, DH + .04, DZ0 - .04, DZ1 + .04, M['black'])
blk(X0 - .9, X0, 0, .14, -.6, .6, M['concrete'], bevel=.01, name='step')

# exterior 3D lettering (stacked alpha planes) + logos
P = lambda n: os.path.join(SIGN, n + '.png')
lettering(P('word_black'), 1.55, .97, -1.35, 2.15, Z1, 0)
lettering(P('logo_black'), .8, .8, -.25, 2.3, Z1, 0, name='logo')
lettering(P('word_black'), 1.3, .81, X0, 2.72, 0, -math.pi / 2, name='letters_l')
lettering(P('word_black'), 1.4, .87, X1 + .03, 2.1, .1, math.pi / 2, name='letters_r')
lettering(P('logo_black'), .7, .7, X1 + .03, 2.2, -.95, math.pi / 2, name='logo_r')
lettering(P('word_black'), 1.6, 1.0, 0, 2.15, Z0, math.pi, name='letters_b')
# rooftop pylon: drive-thru panel, wordmark lightbox, logo disc
py = group(-1.3, HT + .14, -.2, name='pylon')
box(.1, 1.0, .1, M['black'], 0, .5, 0, parent=py, r=.005)
box(1.0, .26, .12, M['black'], 0, .42, 0, parent=py, r=.006)
dm = image_mat('drive_panel', P('drive'), emission=.6)
plane(.96, .24, dm, 0, .42, .061, parent=py); plane(.96, .24, dm, 0, .42, -.061, math.pi, parent=py)
box(.8, 1.0, .16, M['black'], 0, 1.1, 0, parent=py, r=.008)
pm = image_mat('pylon_word', P('word_panel'), emission=.5)
plane(.76, .95, pm, 0, 1.1, .081, parent=py); plane(.76, .95, pm, 0, 1.1, -.081, math.pi, parent=py)
box(.08, .25, .08, M['black'], 0, 1.72, 0, parent=py)
cyl(.58, .58, .2, M['black'], 0, 2.4, 0, parent=py, seg=64, axis='z', bevel=.008)
lm = image_mat('logo_disc', P('logo_disc'), emission=.5, circle=True, rough=.3)
plane(1.14, 1.14, lm, 0, 2.4, .101, parent=py); plane(1.14, 1.14, lm, 0, 2.4, -.101, math.pi, parent=py)

# ================================================================== SITE
bpy.ops.mesh.primitive_plane_add(size=1)
g = bpy.context.active_object; g.name = 'ground'; g.data.materials.append(M['asphalt'])
me = g.data; bm = bmesh.new(); bm.from_mesh(me)
for v in bm.verts: v.co.x *= 160; v.co.y *= 160
box_uv(bm); bm.to_mesh(me); bm.free()
blk(-14, 10, 0, .012, -4.14, 5.04, M['paver'], s=1.0, name='site_pavers')
def curb(x0, x1, z0, z1): return blk(x0, x1, 0, .16, z0, z1, M['curb'], bevel=.01, name='curb')
curb(-14, 10, 1.86, 2.0); curb(-14, 10, 4.9, 5.04); curb(-14, 10, -4.14, -4.0)
blk(-14, X0 - .9, 0, .14, -4, 1.86, M['grass'], name='grass')
blk(X1, 10, 0, .14, -4, 1.86, M['grass'], name='grass')
blk(-14, 10, 0, .14, 5.04, 8.0, M['grass'], name='grass')
blk(X0, X1, 0, .03, Z1, 1.86, M['concrete'], name='apron')
blk(-3.4, -3.05, 0, .06, 2.0, 4.9, M['bump'], bevel=.02, name='speed_bump')
# order-here board
ob_ = group(-5.4, 0, 1.25, -.5, name='menu_board')
box(.12, .9, .12, M['black'], -.8, .45, 0, parent=ob_, r=.004); box(.12, .9, .12, M['black'], .8, .45, 0, parent=ob_, r=.004)
box(2.3, 1.55, .22, M['black'], 0, 1.62, 0, parent=ob_, r=.02)
plane(2.2, .275, image_mat('order_head', P('order_head'), emission=.3), 0, 2.22, .112, parent=ob_)
plane(1.0, 1.0, image_mat('menu_hot', P('menu_hot'), emission=2.2), -.53, 1.48, .112, parent=ob_)
plane(1.0, 1.0, image_mat('menu_iced', P('menu_iced'), emission=2.2), .53, 1.48, .112, parent=ob_)
# neighbourhood: villas / walls far away, street lights
bm_ = stucco_mat('villa', base=(.72, .66, .56))
for x, z, w, h, d in [(-30, -25, 18, 9, 10), (-6, -30, 14, 7, 9), (14, -28, 20, 12, 10), (36, -10, 10, 8, 18), (-38, 8, 10, 10, 16), (10, 32, 26, 8, 8), (-20, 34, 16, 11, 8)]:
    blk(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, bm_, s=2.5, name='villa')
    blk(x - w / 2 - .1, x + w / 2 + .1, h, h + .5, z - d / 2 - .1, z + d / 2 + .1, bm_, s=2.5, name='parapet')
    floors = max(1, int(h // 3.4))
    for fl_ in range(floors):
        wy = 1.2 + fl_ * 3.4
        for k in range(int(w // 3.2)):
            wx = x - w / 2 + 1.6 + k * 3.2
            for zf in (z + d / 2, z - d / 2):
                sgn = 1 if zf > z else -1
                blk(wx - .7, wx + .7, wy, wy + 1.5, min(zf, zf + sgn * .03), max(zf, zf + sgn * .03), M['darkGlass'], name='villa_win')
                blk(wx - .78, wx + .78, wy - .08, wy, min(zf, zf + sgn * .08), max(zf, zf + sgn * .08), M['white'], name='villa_sill')

# ------------------------------------------------------------------ imported real models
def import_model(name, scale=1.0, loc=(0, 0, 0), rz=0.0, parent=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODD, name, name + '.gltf'))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name + '_root', None); link(root, parent)
    for o in new:
        if o.parent is None or o.parent not in new: o.parent = root
        for c in o.users_collection:
            if c != col: c.objects.unlink(o)
        if o.name not in col.objects: col.objects.link(o)
    root.scale = (scale, scale, scale); root.location = B(*loc); root.rotation_euler = (0, 0, rz)
    return root

for x, z in [(-9.5, -1.0), (7.5, -1.8), (-12, 6.8), (5, 7.0)]: import_model('island_tree_01', .75, (x, .14, z), rz=x)
for x, z in [(-7.5, -2.5), (6.3, -.5)]: import_model('shrub_02', .35, (x, .14, z))
import_model('potted_plant_02', 1.0, (X0 - .55, .14, .95), rz=1.2)
import_model('potted_plant_02', 1.0, (X0 - .55, .14, -.95), rz=-.4)
for x in (-11, 1, 13):
    cyl(.06, .1, 8, M['brushed'], x, 4.14, 7.2, bevel=.01); box(1.6, .08, .12, M['brushed'], x, 8.05, 6.5, r=.02)
    box(.6, .06, .25, M['brushed'], x, 8.0, 5.8, r=.02)
import_model('security_camera_01', 1.0, (X0 - .02, 2.75, -1.25), rz=-math.pi / 2)
import_model('security_camera_01', 1.0, (X0 + .25, 2.75, Z1 + .02), rz=math.pi)

# ================================================================== INTERIOR
CT = .9
BZ0, BZ1, BX1 = zi0, -.76, 1.66
blk(xi0, BX1, 0, .1, BZ0, BZ1 - .05, M['matteBlack'])
blk(xi0, BX1, .1, CT - .04, BZ0, BZ1 - .02, M['oak'], name='back_cabinet')
blk(xi0, BX1, CT - .04, CT, BZ0, BZ1 + .02, M['quartz'], bevel=.004, name='back_top')
blk(xi0, BX1, CT, 1.55, zi0, zi0 + .012, M['subway'], name='backsplash')
FZ0, FX0 = .76, -1.95
blk(FX0, xi1, 0, .1, FZ0 + .05, zi1, M['matteBlack'])
blk(FX0, xi1, .1, CT - .04, FZ0 + .02, zi1, M['oak'], name='front_cabinet')
blk(FX0, xi1, CT - .04, CT, FZ0 - .02, zi1, M['quartz'], bevel=.004, name='front_top')
def fronts(x0, x1, zf, d, n, steel=False):
    w = (x1 - x0) / n
    for i in range(n):
        a = x0 + i * w + .004; b = a + w - .008
        if steel: blk(a, b, .12, CT - .06, min(zf, zf + d * .014), max(zf, zf + d * .014), M['brushed'], bevel=.003)
        else: blk(a + w - .006, a + w - .002, .12, CT - .06, min(zf, zf + d * .003), max(zf, zf + d * .003), M['matteBlack'])
        blk(a + .06, b - .06, CT - .13, CT - .11, min(zf + d * .014, zf + d * .04), max(zf + d * .014, zf + d * .04), M['steel'], bevel=.004)
fronts(-1.7, .55, BZ1 - .02, 1, 3, True); fronts(.55, BX1, BZ1 - .02, 1, 2); fronts(-.3, 1.0, FZ0 + .02, -1, 2)
blk(xi0 + .02, -1.72, .1, CT - .06, BZ1 - .02, BZ1 + .006, M['brushed'], bevel=.003, name='ice_maker')
for i in range(6): blk(xi0 + .08, -1.78, .16 + i * .03, .175 + i * .03, BZ1, BZ1 + .015, M['matteBlack'])
blk(xi0 + .1, -1.8, CT - .16, CT - .12, BZ1, BZ1 + .04, M['steel'], bevel=.005)

def espresso(p):
    box(.86, .44, .56, M['steel'], 0, .28, 0, p, r=.03)
    box(.02, .46, .58, M['black'], -.44, .28, 0, p, r=.008); box(.02, .46, .58, M['black'], .44, .28, 0, p, r=.008)
    box(.8, .14, .02, M['black'], 0, .42, .285, p, r=.005)
    box(.2, .06, .006, M['screenBlue'], 0, .43, .296, p)
    box(.8, .02, .5, M['brushed'], 0, .51, 0, p, r=.004)
    for i in range(8): cyl(.035, .027, .055, M['ceramic'], -.33 + (i % 4) * .1, .5475, -.12 + (i // 4) * .13, p, bevel=.003)
    for gx in (-.2, .2):
        cyl(.055, .055, .06, M['chrome'], gx, .24, .3, p, bevel=.004)
        cyl(.047, .04, .035, M['chrome'], gx, .195, .31, p, bevel=.003)
        h = box(.032, .032, .17, M['black'], gx, .19, .43, p, r=.012); h.rotation_euler = (-.2, 0, 0)
        for dx in (-.04, .04): cyl(.028, .022, .05, M['ceramic'], gx + dx, .1, .32, p, bevel=.003)
    box(.8, .025, .2, M['chrome'], 0, .07, .33, p, r=.004)
    for sx in (-.39, .39):
        w = cyl(.008, .008, .26, M['chrome'], sx, .2, .33, p, seg=12); w.rotation_euler = (0, .22 if sx > 0 else -.22, 0)
        cyl(.018, .018, .05, M['black'], sx * .98, .34, .32, p, seg=16)
def grinder(p):
    box(.2, .1, .3, M['black'], 0, .05, 0, p, r=.015); box(.18, .32, .2, M['matteBlack'], 0, .26, -.04, p, r=.03)
    box(.06, .05, .06, M['black'], 0, .25, .08, p, r=.01); cyl(.045, .045, .015, M['black'], 0, .11, .07, p)
    cyl(.1, .055, .22, M['clear'], 0, .53, -.04, p, seg=40); cyl(.085, .056, .12, M['beans'], 0, .48, -.04, p)
    cyl(.104, .104, .02, M['black'], 0, .65, -.04, p, bevel=.004)
def blender_(p):
    box(.17, .18, .19, M['black'], 0, .09, 0, p, r=.02); box(.06, .03, .006, M['acLed'], 0, .1, .098, p)
    cyl(.08, .06, .26, M['clear'], 0, .32, 0, p, seg=40); cyl(.082, .082, .03, M['black'], 0, .465, 0, p, bevel=.004)
def cupstack(p, x, y, z, r, h, mat=None):
    cyl(r, r * .72, h, mat or M['paperCup'], x, y + h / 2, z, p, bevel=.002); cyl(r + .003, r + .003, .008, mat or M['paperCup'], x, y + h, z, p)
def bottle(p, x, y, z, color, h=.3):
    m = glass('syrup_%d' % int(color[0] * 1000 + color[1] * 100), color=color)
    cyl(.035, .035, h * .7, m, x, y + h * .35, z, p); cyl(.015, .035, h * .15, m, x, y + h * .775, z, p)
    cyl(.012, .012, h * .14, M['black'], x, y + h * .9, z, p, seg=16); box(.05, .012, .012, M['black'], x + .02, y + h * .97, z, p)
def bag(p, x, y, z, mat, ry=0.0):
    g_ = group(x, y, z, ry, p); box(.16, .24, .09, mat, 0, .12, 0, g_, r=.02); box(.1, .08, .004, M['paperCup'], 0, .13, .046, g_)

R = None
blender_(group(-2.12, CT, -1.08)); blender_(group(-1.9, CT, -1.08))
grinder(group(-1.45, CT, -1.07)); grinder(group(-1.15, CT, -1.07))
espresso(group(-.35, CT, -1.07, name='espresso'))
box(.22, .1, .2, M['black'], .3, CT + .05, -1.0, r=.01)
for x, z in ((.48, -.92), (.56, -1.0)): cyl(.045, .05, .12, M['steel'], x, CT + .06, z, bevel=.003)
box(.3, .01, .2, M['rubber'], .32, CT + .005, -1.22); cyl(.03, .03, .08, M['steel'], .3, CT + .05, -1.2); cyl(.045, .045, .012, M['steel'], .3, CT + .09, -1.2)
bb = group(.78, CT, -1.13, name='batch_brewer')
box(.24, .5, .34, M['black'], 0, .25, 0, bb, r=.02); box(.2, .06, .26, M['brushed'], 0, .44, .03, bb, r=.005)
cyl(.07, .07, .2, M['clear'], 0, .13, .1, bb, seg=40); cyl(.072, .072, .03, M['black'], 0, .245, .1, bb); cyl(.06, .065, .1, M['coffee'], 0, .08, .1, bb)
box(.16, .03, .16, M['black'], 1.06, CT + .015, -1.0, r=.01)
cyl(.06, .045, .04, M['ceramic'], 1.06, CT + .11, -1.0); cyl(.075, .03, .08, M['ceramic'], 1.06, CT + .17, -1.0)
cyl(.05, .06, .1, M['clear'], 1.06, CT + .08, -1.0)
cyl(.055, .065, .15, M['black'], 1.18, CT + .075, -1.22, bevel=.004)
sp = cyl(.006, .008, .22, M['black'], 1.24, CT + .17, -1.17, seg=10); sp.rotation_euler = (-.4, .8, 0)
blk(1.15, 1.6, CT - .002, CT + .002, -1.32, -.84, M['brushed']); blk(1.19, 1.56, CT - .14, CT + .003, -1.28, -.88, M['steel'], name='sink_bowl')
cyl(.015, .015, .32, M['chrome'], 1.38, CT + .16, -1.3, seg=16)
torus(.1, .013, M['chrome'], 1.38, CT + .32, -1.2, arc=math.pi, rot=(math.pi / 2, 0, math.pi / 2))
for y in (1.68, 2.05): blk(xi0 + .05, .3, y, y + .035, zi0, zi0 + .28, M['oak'], bevel=.003, name='shelf')
for i, c in enumerate([(.6, .25, .05), (.35, .1, .04), (.85, .6, .15), (.9, .88, .8), (.18, .07, .03), (.6, .05, .1), (.8, .5, .3)]):
    bottle(None, -2.2 + i * .12, 1.715, -1.24, c)
for i in range(6):
    cyl(.045, .04, .095, M['ceramic'], -1.25 + i * .12, 1.7625, -1.24, bevel=.003)
    torus(.028, .007, M['ceramic'], -1.2 + i * .12, 1.765, -1.24, rot=(math.pi / 2, 0, 0))
for i in range(4): cyl(.055, .05, .05, M['ceramic'], -.55 + i * .13, 1.74, -1.24, bevel=.003)
for i, mm in enumerate([M['kraft'], M['bagBlack'], M['kraft'], M['bagGold'], M['bagBlack'], M['kraft']]): bag(None, -2.15 + i * .2, 2.085, -1.22, mm)
for i in range(5): cupstack(None, -.85 + i * .22, 2.085, -1.22, .045, .2, M['ceramic'])
blk(-.95, .25, 2.28, 2.72, zi0, zi0 + .04, M['black'], bevel=.004, name='sign_panel')
lettering(P('word_warm'), 1.0, .39, -.38, 2.5, zi0 + .04, 0, depth=.012, layers=3, name='sign_word', emission=6.0)
lettering(P('logo_warm'), .34, .34, .07, 2.5, zi0 + .04, 0, depth=.012, layers=3, name='sign_logo', emission=6.0)
# KDS screen + POS screens with switchable states
blk(.62, 1.42, 1.6, 2.06, zi0, zi0 + .04, M['black'], bevel=.004, name='kds_frame')
screens = {'kds': [], 'pos': []}
for s in range(4):
    screens['kds'].append(plane(.76, .42, image_mat(f'kds_{s}', P(f'kds_{s}'), emission=1.6, rough=.15), 1.02, 1.83, zi0 + .041 + s * .0002, name=f'kds_{s}'))
# display fridge (glass door faces the aisle)
fx0, fx1, fz0, fz1 = 1.68, xi1, zi0, -.7
blk(fx0, fx1, 0, 2.05, fz0, fz0 + .04, M['brushed']); blk(fx0, fx0 + .04, 0, 2.05, fz0, fz1 - .04, M['brushed']); blk(fx1 - .04, fx1, 0, 2.05, fz0, fz1 - .04, M['brushed'])
blk(fx0, fx1, 1.95, 2.05, fz0, fz1 - .04, M['brushed']); blk(fx0, fx1, 0, .12, fz0, fz1 - .04, M['brushed'])
blk(fx0 + .04, fx1 - .04, .12, 1.95, fz0 + .04, fz0 + .05, M['white'])
blk(fx0 + .05, fx1 - .05, 1.9, 1.92, fz0 + .06, fz1 - .1, M['fridgeLight'], name='fridge_led')
milk = [pbr('milk_blue', color=(.05, .2, .6), rough=.4), pbr('milk_red', color=(.6, .06, .03), rough=.4), pbr('milk_green', color=(.05, .4, .15), rough=.4)]
water = glass('water', color=(.85, .93, 1.0))
for i in range(4):
    y = .3 + i * .42; blk(fx0 + .04, fx1 - .04, y, y + .012, fz0 + .05, fz1 - .06, M['clear'])
    for k in range(4):
        x = fx0 + .12 + k * .15
        if i % 2: cyl(.032, .032, .2, water, x, y + .112, fz1 - .2); cyl(.014, .014, .03, milk[0], x, y + .227, fz1 - .2)
        else: box(.1, .24, .08, M['white'], x, y + .132, fz1 - .2, r=.008); box(.1, .06, .082, milk[k % 3], x, y + .1, fz1 - .2)
blk(fx0 + .04, fx1 - .04, .12, 1.95, fz1 - .03, fz1 - .024, M['glass'], name='fridge_door_glass')
blk(fx0, fx0 + .04, 0, 2.05, fz1 - .04, fz1, M['black']); blk(fx1 - .04, fx1, 0, 2.05, fz1 - .04, fz1, M['black'])
blk(fx0, fx1, 1.95, 2.05, fz1 - .04, fz1, M['black']); blk(fx0, fx1, 0, .12, fz1 - .04, fz1, M['black'])
blk(fx0 + .07, fx0 + .1, .6, 1.5, fz1, fz1 + .03, M['steel'], bevel=.006)
# end-wall storage shelving
sx0, sx1 = xi1 - .36, xi1
for z in (0, .72): blk(sx0, sx1, 0, 2.2, z - .02, z + .02, M['black'], bevel=.003)
for i, y in enumerate((.12, .55, 1.0, 1.45, 1.9)):
    blk(sx0, sx1, y, y + .025, 0, .72, M['oak'], bevel=.003)
    for k in range(3):
        z = .14 + k * .22
        if i == 0: import_model('cardboard_box_01', .6, (sx0 + .17, y + .025, z), rz=math.pi / 2 + k * .1)
        elif i == 4: cupstack(None, sx0 + .17, y + .025, z, .05, .3)
        else: bag(None, sx0 + .17, y + .025, z, [M['kraft'], M['bagBlack'], M['bagGold']][(k + i) % 3], -math.pi / 2)
# front counter: cup station, syrups, pastry case, POS
for i, (r, h) in enumerate(((.05, .42), (.045, .38), (.04, .32))): cupstack(None, -1.78 + i * .13, CT, 1.05, r, h)
for i in range(3): cupstack(None, -1.78 + i * .13, CT, 1.25, .05, .3, M['matteBlack'])
cyl(.05, .05, .2, M['steel'], -1.36, CT + .1, 1.2)
for i in range(9): cyl(.003, .003, .22, M['matteBlack'], -1.38 + (i % 3) * .02, CT + .22, 1.18 + (i // 3) * .02, seg=6)
for i, c in enumerate([(.6, .25, .05), (.35, .1, .04), (.85, .6, .15), (.9, .88, .8)]): bottle(None, -1.15 + i * .1, CT, 1.12, c, .34)
pc = group(-.42, CT, 1.08, name='pastry_case')
box(.72, .06, .44, M['black'], 0, .03, 0, pc, r=.006); box(.72, .02, .44, M['black'], 0, .44, 0, pc, r=.004)
box(.72, .36, .006, M['clear'], 0, .24, -.22, pc); box(.006, .36, .44, M['clear'], -.36, .24, 0, pc); box(.006, .36, .44, M['clear'], .36, .24, 0, pc)
box(.7, .008, .4, M['clear'], 0, .22, 0, pc); box(.6, .006, .02, M['warmLed'], 0, .425, -.18, pc)
for i in range(4): import_model('croissant', .6, (-.25 + i * .16, .06, -.05), rz=.3 * i, parent=pc)
import_model('carrot_cake', .7, (-.17, .225, .03), parent=pc); import_model('strawberry_chocolate_cake', .7, (.17, .225, .03), rz=.5, parent=pc)
box(.1, .02, .1, M['black'], .55, CT + .01, 1.12, r=.004); cyl(.015, .015, .2, M['black'], .55, CT + .11, 1.12, seg=16)
posg = group(.55, CT + .27, 1.1, math.pi, name='pos'); posg.rotation_euler = (.35, 0, math.pi)
box(.32, .22, .02, M['black'], 0, 0, 0, posg, r=.008)
for s in range(4):
    screens['pos'].append(plane(.3, .2, image_mat(f'pos_{s}', P(f'pos_{s}'), emission=1.4, rough=.1), 0, 0, .0105 + s * .0002, parent=posg, name=f'pos_{s}'))
box(.16, .12, .2, M['matteBlack'], .9, CT + .06, 1.15, r=.015)
t_ = box(.08, .02, .16, M['black'], 1.75, CT + .11, 1.22, r=.01); t_.rotation_euler = (-.3, 0, 0)
# drinks tray for the hand-off
tray = group(.6, CT, 1.05, name='tray')
box(.34, .02, .22, M['black'], 0, .01, 0, tray, r=.006)
iced = glass('iced_cup', color=(.97, .97, .97))
latte = pbr('iced_latte', color=(.35, .2, .1), rough=.2)
cyl(.045, .033, .15, M['paperCup'], -.08, .095, 0, tray, bevel=.002); cyl(.047, .047, .02, M['white'], -.08, .18, 0, tray); cyl(.046, .045, .05, M['kraft'], -.08, .11, 0, tray)
cyl(.045, .033, .15, iced, .08, .095, 0, tray); cyl(.04, .031, .1, latte, .08, .07, 0, tray); cyl(.046, .046, .012, M['clear'], .08, .175, 0, tray)
s_ = cyl(.004, .004, .14, M['matteBlack'], .09, .23, 0, tray, seg=8); s_.rotation_euler = (0, -.15, 0)
# ceiling: LED panels (+ area lights), shelf LED strip
for x in (-1.25, 1.15):
    blk(x - .6, x + .6, CEIL - .02, CEIL, -.3, .3, M['panel'], name='led_panel')
    L_ = bpy.data.lights.new('ceiling', 'AREA'); L_.shape = 'RECTANGLE'; L_.size = 1.15; L_.size_y = .55; L_.energy = 180; L_.color = (1, .93, .84)
    lo = bpy.data.objects.new('ceiling_light', L_); link(lo); lo.location = B(x, CEIL - .03, 0)
blk(xi0 + .1, BX1, CEIL - .02, CEIL, -1.0, -.97, M['warmLed'], name='led_strip')
for y in (1.68, 2.05): blk(xi0 + .05, .3, y - .006, y, zi0 + .2, zi0 + .215, M['warmLed'], name='shelf_led')
fl = bpy.data.lights.new('fridge', 'POINT'); fl.energy = 8; fl.color = (.9, .95, 1); flo = bpy.data.objects.new('fridge_pt', fl); link(flo); flo.location = B(2.03, 1.6, -1.05)
# A/C, extinguisher, first aid, bin, clock, mat
box(.95, .3, .22, M['white'], -1.0, 2.55, zi1 - .11, r=.04); blk(-1.45, -.55, 2.42, 2.44, zi1 - .22, zi1 - .2, M['white'])
box(.08, .02, .008, M['acLed'], -.7, 2.5, zi1 - .222)
import_model('korean_fire_extinguisher_01', .76, (xi0 + .16, 0, .95), rz=math.pi / 2)
plane(.18, .18, image_mat('fire_sign', P('fire_sign')), xi0 + .003, 1.35, .95, -math.pi / 2)
import_model('medical_box', .55, (xi0 + .03, 1.55, -1.0), rz=-math.pi / 2).rotation_euler = (math.pi / 2, 0, -math.pi / 2)
cyl(.16, .15, .55, M['brushed'], -2.17, .275, 1.12, bevel=.004); cyl(.165, .165, .02, M['black'], -2.17, .555, 1.12)
import_model('wall_clock', 1.0, (xi1 - .005, 2.45, .36), rz=-math.pi / 2)
blk(-1.6, 1.4, .015, .028, -.5, .5, M['rubber'], bevel=.004, name='floor_mat')

# ================================================================== CAR  (white SUV, driver side toward the kiosk)
car = group(-30, 0, 3.0, name='car')
body = box(4.55, .7, 1.84, M['carPaint'], 0, .66, 0, car, r=.16)
sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
bm = cube_bm(2.7, 1.66, .6)
for v in bm.verts:
    if v.co.z > 0: v.co.x = v.co.x * .78 - .1; v.co.y *= .86
bm.normal_update(); box_uv(bm)
gh = mk_obj('greenhouse', bm, M['darkGlass'], car, bevel=.06, seg=3); gh.location = B(-.25, 1.31, 0)
bm = cube_bm(2.0, 1.4, .06); box_uv(bm); rf = mk_obj('roof', bm, M['carPaint'], car, bevel=.025, seg=3); rf.location = B(-.32, 1.625, 0)
for x in (-1.25, .1, .95): box(.08, .58, 1.6, M['carPaint'], x, 1.3, 0, car, r=.02)
for x in (-1.45, 1.45):
    for z in (-.82, .82):
        w = cyl(.37, .37, .26, M['tire'], x, .37, z, car, seg=40, axis='z', bevel=.05)
        cyl(.24, .24, .27, M['brushed'], x, .37, z, car, seg=32, axis='z', bevel=.01)
for z in (-.62, .62):
    box(.05, .1, .34, M['headlight'], 2.26, .8, z, car, r=.02); box(.05, .1, .3, M['taillight'], -2.26, .82, z, car, r=.02)
box(.16, .11, .14, M['carPaint'], .95, 1.12, -1.0, car, r=.03); box(.03, .03, .1, M['black'], .95, 1.08, -.92, car)  # mirror
for x in (-.5, .55): box(.012, .55, .004, M['matteBlack'], x, .72, -.922, car)
for x in (-.25, .8): box(.14, .025, .02, M['chrome'], x, .9, -.93, car, r=.008)
box(4.6, .14, 1.86, M['matteBlack'], 0, .36, 0, car, r=.05)
arm = group(.3, 1.2, -.52, name='arm', parent=car)
box(.09, .09, .5, M['thobe'], 0, 0, -.25, arm, r=.04)
hand = bpy.data.objects.new('hand', bpy.data.meshes.new('hand')); link(hand, arm)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=.05); bm.to_mesh(hand.data); bm.free(); hand.data.materials.append(M['skin']); hand.location = B(0, 0, -.52)
for p_ in hand.data.polygons: p_.use_smooth = True

car_parts = [car] + list(car.children_recursive)
# ================================================================== CAMERA PATH & ANIMATION
K = [
  (0.0, (9.5, 7.8, 13.5), (0, 1.8, 0)), (4.0, (3.5, 3.6, 10.0), (-.3, 2.2, .5)), (7.5, (-5.5, 2.4, 7.5), (-1.2, 2.0, 0)),
  (10.0, (-6.2, 1.66, 0.0), (-2.5, 1.45, 0)), (12.2, (-4.1, 1.66, 0.0), (-2.5, 1.5, 0)), (14.5, (-1.95, 1.65, 0.0), (2.4, 1.45, -.05)),
  (17.3, (-1.75, 1.64, .1), (-2.05, 1.15, -1.38)), (19.6, (-1.6, 1.64, .12), (-1.3, 1.25, -1.38)), (22.3, (-.75, 1.6, .05), (-.35, 1.2, -1.38)),
  (25.0, (-.55, 1.5, -.15), (-.35, 1.13, -1.2)), (27.8, (.25, 1.6, .1), (1.1, 1.25, -1.38)), (30.6, (.55, 1.64, .1), (2.38, 1.15, -.95)),
  (33.0, (.75, 1.64, .05), (2.38, 1.25, .3)), (35.6, (.5, 1.64, -.25), (-.35, 1.12, 1.38)), (38.3, (.1, 1.64, -.35), (-1.65, 1.15, 1.25)),
  (41.0, (-.4, 1.64, -.4), (-2.38, 1.35, .85)), (43.8, (.55, 1.62, -.05), (.7, 1.45, 1.5)), (46.5, (.72, 1.6, .25), (.7, 1.38, 3.0)),
  (49.2, (.66, 1.52, .55), (.56, 1.12, 1.12)), (52.0, (.75, 1.6, .2), (.68, 1.25, 2.2)), (55.5, (.7, 1.62, .1), (.6, 1.45, 3.2)), (60.0, (.6, 1.64, -.1), (.5, 1.5, 3.4)),
]
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def smooth(x): x = clamp(x); return x * x * (3 - 2 * x)
def smoother(x): x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)
def ramp(t, a, b): return clamp((t - a) / (b - a))
def centripetal(P0, P1, P2, P3, u):
    # centripetal Catmull-Rom segment P1->P2
    def tj(ti, a, b): return ti + max((b - a).length, 1e-4) ** .5
    t0 = 0; t1 = tj(t0, P0, P1); t2 = tj(t1, P1, P2); t3 = tj(t2, P2, P3); t = t1 + (t2 - t1) * u
    A1 = P0 * ((t1 - t) / (t1 - t0)) + P1 * ((t - t0) / (t1 - t0)); A2 = P1 * ((t2 - t) / (t2 - t1)) + P2 * ((t - t1) / (t2 - t1)); A3 = P2 * ((t3 - t) / (t3 - t2)) + P3 * ((t - t2) / (t3 - t2))
    B1 = A1 * ((t2 - t) / (t2 - t0)) + A2 * ((t - t0) / (t2 - t0)); B2 = A2 * ((t3 - t) / (t3 - t1)) + A3 * ((t - t1) / (t3 - t1))
    return B1 * ((t2 - t) / (t2 - t1)) + B2 * ((t - t1) / (t2 - t1))
PTS = [Vector(k[1]) for k in K]; LKS = [Vector(k[2]) for k in K]
def spline(pts, i, u):
    P0 = pts[i - 1] if i > 0 else pts[0] * 2 - pts[1]; P3 = pts[i + 2] if i + 2 < len(pts) else pts[-1] * 2 - pts[-2]
    return centripetal(P0, pts[i], pts[i + 1], P3, u)
def cam_at(t):
    i = 0
    while i < len(K) - 2 and t >= K[i + 1][0]: i += 1
    u = clamp((t - K[i][0]) / (K[i + 1][0] - K[i][0])); u = .35 * u + .65 * smoother(u)
    return spline(PTS, i, u), spline(LKS, i, u)

cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); link(cam); scn.camera = cam
cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 24.0; cam_d.clip_start = .03; cam_d.clip_end = 800
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 4.0
cam.rotation_mode = 'QUATERNION'
scn.render.fps = FPS; NF = int(DUR * FPS); scn.frame_start = 0; scn.frame_end = NF - 1

LBL = [
  (10.4, 13.6, (-2.5, 2.25, .0), 'باب الدخول الجانبي', 'Staff entrance'),
  (16.0, 19.4, (-2.0, 1.25, -1.08), 'خلاطات المشروبات الباردة', 'Blenders'),
  (16.4, 19.6, (-2.1, .55, -.76), 'صانعة الثلج', 'Ice maker'),
  (18.6, 22.0, (-1.3, 1.6, -1.1), 'مطاحن الإسبريسو', 'Espresso grinders'),
  (21.6, 27.2, (-.35, 1.45, -1.07), 'ماكينة إسبريسو مزدوجة', '2-group espresso machine'),
  (22.6, 26.6, (-.6, .55, -.76), 'ثلاجات تحت الكاونتر', 'Under-counter fridges'),
  (26.4, 30.0, (.78, 1.45, -1.13), 'محطة التقطير والقهوة المفلترة', 'Batch brew & pour-over'),
  (27.0, 30.4, (1.38, 1.0, -1.05), 'حوض غسيل', 'Sink'),
  (27.4, 31.0, (1.02, 2.08, -1.36), 'شاشة الطلبات', 'Kitchen display'),
  (29.8, 33.0, (2.03, 1.45, -.72), 'ثلاجة عرض الحليب والمياه', 'Display fridge'),
  (32.0, 35.2, (2.2, 1.55, .36), 'مخزن البن والأكواب', 'Beans & cup storage'),
  (34.8, 38.0, (-.42, 1.4, 1.08), 'عرض المخبوزات', 'Pastry display'),
  (35.2, 38.4, (.55, 1.3, 1.1), 'نقطة البيع', 'POS terminal'),
  (37.6, 41.0, (-1.65, 1.2, 1.1), 'محطة الأكواب والأغطية', 'Cup & lid station'),
  (38.0, 41.4, (-1.0, 2.4, 1.25), 'مكيف سبليت', 'Split A/C'),
  (40.2, 43.4, (-2.28, 1.05, .95), 'طفاية حريق', 'Fire extinguisher'),
]
label_track = []

def key_all(ob, path, frame): ob.keyframe_insert(path, frame=frame)
for f in range(NF):
    t = f / FPS
    p, l = cam_at(t); p2, _ = cam_at(t + .05); speed = (p2 - p).length / .05
    bob = math.sin(t * 9.5) * .012 * clamp(speed / .6) if t > 12 else 0
    p = p + Vector((math.sin(t * .7) * .006, bob + math.sin(t * 1.1) * .004, math.cos(t * .8) * .006))
    l = l + Vector((math.sin(t * .53) * .01, math.sin(t * .71) * .008, 0))
    bp, bl = B(*p), B(*l)
    cam.location = bp; cam.rotation_quaternion = (bl - bp).to_track_quat('-Z', 'Y')
    vfov = 50 if t < 10 else 50 + (68 - 50) * smooth(ramp(t, 10, 14.5))
    cam_d.lens = 12.0 / math.tan(math.radians(vfov) / 2)
    cam_d.dof.focus_distance = max(.4, (bl - bp).length)
    key_all(cam, 'location', f); key_all(cam, 'rotation_quaternion', f); cam_d.keyframe_insert('lens', frame=f); cam_d.keyframe_insert('dof.focus_distance', frame=f)
    d_open = smooth(ramp(t, 10.6, 12.0)) - smooth(ramp(t, 15.4, 16.8)); door.rotation_euler = (0, 0, -d_open * 1.75); key_all(door, 'rotation_euler', f)
    slide.location = Vector((smoother(ramp(t, 44.6, 46.0)) * .96, 0, 0)); key_all(slide, 'location', f)
    cu = ramp(t, 40.2, 46.4); ce = 1 - (1 - cu) ** 2.6; car.location = B(-22 + (22.52) * ce, 0, 3.0); key_all(car, 'location', f)
    for o in car_parts: o.hide_render = t < 39.0; o.keyframe_insert('hide_render', frame=f)
    tu = smoother(ramp(t, 51.2, 53.6)); take = smoother(ramp(t, 54.4, 55.8))
    tray.location = B(.6 + take * .05, CT + tu * .1 + take * .28, 1.05 + .57 * tu + take * .62); key_all(tray, 'location', f)
    sc = max(.001, smooth(ramp(t, 50.2, 50.8))); tray.scale = (sc, sc, sc); key_all(tray, 'scale', f)
    reach = smooth(ramp(t, 53.2, 54.4)) - smooth(ramp(t, 55.2, 56.2)) * .6
    arm.rotation_euler = (-.9 + .75 * reach, 0, 0); arm.scale = (1, 1, 1); key_all(arm, 'rotation_euler', f)
    ev = 0.0 - 0.35 * smooth(ramp(t, 11.6, 14.2))   # auto-exposure: brighter once inside
    scn.view_settings.exposure = ev; scn.view_settings.keyframe_insert('exposure', frame=f)
    # screen states
    st = 0 if t < 47.6 else (3 if t >= 51 else (1 + int((t - 47.6) * 2.5) % 2))
    for kind in ('kds', 'pos'):
        for s, ob in enumerate(screens[kind]):
            hide = s != st; ob.hide_render = hide; ob.hide_viewport = hide; ob.keyframe_insert('hide_render', frame=f)
    # label projection for the overlay pass
    scn.frame_set(f) if False else None
    label_track.append((t, bp.copy(), bl.copy(), vfov))

# constant/linear interpolation
for ob in bpy.data.objects:
    ad = ob.animation_data
    if ad and ad.action:
        for fc in ad.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT' if fc.data_path == 'hide_render' else 'LINEAR'
for idb in (cam_d, scn):
    ad = idb.animation_data
    if ad and ad.action:
        for fc in ad.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# export projected label anchors (normalized screen coords) for compositing
out = {'fps': FPS, 'frames': NF, 'labels': [{'a': a, 'b': b, 'ar': ar, 'en': en} for a, b, _, ar, en in LBL], 'pos': []}
aspect = 16 / 9
for (t, bp, bl, vfov) in label_track:
    q = (bl - bp).to_track_quat('-Z', 'Y'); Rm = q.to_matrix().transposed()
    th = math.tan(math.radians(vfov) / 2); row = []
    for (_, _, p3, _, _) in LBL:
        v = Rm @ (B(*p3) - bp)
        if v.z >= -.05: row.append(None); continue
        x = (v.x / -v.z) / (th * aspect); y = (v.y / -v.z) / th
        row.append([round((x * .5 + .5), 4), round((.5 - y * .5), 4)])
    out['pos'].append(row)
json.dump(out, open(os.path.join(ROOT, 'build', f'labels_{FPS}.json'), 'w'), ensure_ascii=False)

# ================================================================== RENDER SETTINGS
r = scn.render; r.engine = 'CYCLES'; r.resolution_x = int(os.environ.get('RES_X', 1280)); r.resolution_y = int(os.environ.get('RES_Y', 720)); r.resolution_percentage = 100
r.use_persistent_data = True; r.use_motion_blur = False; r.motion_blur_shutter = .4
r.use_overwrite = False; r.use_placeholder = True; r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.image_settings.compression = 15
cy = scn.cycles; cy.device = 'CPU'; cy.samples = int(os.environ.get('SAMPLES', 16)); cy.use_adaptive_sampling = True; cy.adaptive_threshold = .06
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'; cy.denoising_prefilter = 'ACCURATE'
cy.max_bounces = 6; cy.diffuse_bounces = 2; cy.glossy_bounces = 2; cy.transmission_bounces = 6; cy.transparent_max_bounces = 16
cy.sample_clamp_indirect = 4.0; cy.blur_glossy = 1.0; cy.caustics_reflective = False; cy.caustics_refractive = False
cy.use_light_tree = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=False)
print('SAVED', OUT_BLEND, 'frames', NF)
