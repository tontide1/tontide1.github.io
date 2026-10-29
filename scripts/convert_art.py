import colorsys
import json
from PIL import Image

def convert():
    ref = Image.open('docs/mockup/ASCII Monkey on a Midnight Branch.png')
    w_orig, h_orig = ref.size

    # Bounding box of monkey + branch artwork in reference image:
    crop_x0, crop_y0, crop_x1, crop_y1 = 615, 68, 1788, 715
    crop_w = crop_x1 - crop_x0
    crop_h = crop_y1 - crop_y0

    crop_img = ref.crop((crop_x0, crop_y0, crop_x1, crop_y1))
    pix = crop_img.load()

    # Resolution increased by ~18% and strict 1:1 square aspect ratio
    GRID_COLS = 144
    cell_w = crop_w / GRID_COLS
    cell_h = cell_w  # 1:1 strict square
    GRID_ROWS = int(crop_h / cell_h)

    print(f"Crop: {crop_w}x{crop_h} -> Grid: {GRID_COLS} cols x {GRID_ROWS} rows (cell: {cell_w:.2f}x{cell_h:.2f}px)")

    MONKEY_ANCHOR_COL = 60
    MONKEY_ANCHOR_ROW = 42

    DENSE_BLOCK_GLYPHS = ['8', 'B', 'W', 'M', '#', '&', '%', '$', '0', 'Q', 'S', '@']
    MID_GLYPHS = ['*', 'x', 's', '+', '=', 'o', ':', ';']
    ORANGE_LEAF_GLYPHS = ['8', 'S', '&', '%', '$', '#', 'B', '0', '*']
    RAMP = " .':;+*=x#%8&$@"
    TORSO_DENSE_RAMP = ['*', 'x', '#', '%', '8', '&', '$', '@']

    def boost_color(r, g, b, is_tail_tip=False, is_face=False, is_leaf=False):
        if is_tail_tip:
            return 238, 228, 216
        if is_face:
            return 248, 238, 222

        rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
        h, s, v = colorsys.rgb_to_hsv(rf, gf, bf)
        
        if is_leaf or (rf > gf * 1.15 and rf > bf * 1.40 and s > 0.20):
            s = min(1.0, s * 1.35)
            v = min(1.0, v * 1.45)
        elif s < 0.24 and v > 0.45:
            v = min(1.0, v * 1.45)
            s = min(s, 0.12)
            h = 0.10
        else:
            v = min(1.0, v * 1.40)
            
        br, bg, bb = colorsys.hsv_to_rgb(h, s, v)
        return int(round(br * 255)), int(round(bg * 255)), int(round(bb * 255))

    raw_cells = {}
    for r in range(GRID_ROWS):
        y0 = int(r * cell_h)
        y1 = int((r + 1) * cell_h)
        for c in range(GRID_COLS):
            x0 = int(c * cell_w)
            x1 = int((c + 1) * cell_w)
            
            abs_x0 = crop_x0 + x0
            abs_y0 = crop_y0 + y0
            
            # Mask out bottom-left prose copy
            if x0 < 370 and y0 > 440: continue
            # Mask out top nav
            if abs_y0 < 75 and abs_x0 < 1050: continue
            # Mask out footer
            if y0 > 600 and x0 > 980: continue

            rgbs = [pix[x, y][:3] for y in range(y0, y1) for x in range(x0, x1)]
            if not rgbs: continue

            rgbs_sorted = sorted(rgbs, key=lambda p: 0.299*p[0] + 0.587*p[1] + 0.114*p[2])
            pmax = rgbs_sorted[-1]
            p90 = rgbs_sorted[int(len(rgbs) * 0.90)]
            p25 = rgbs_sorted[int(len(rgbs) * 0.25)]
            p10 = rgbs_sorted[int(len(rgbs) * 0.10)]
            
            max_lum = 0.299*pmax[0] + 0.587*pmax[1] + 0.114*pmax[2]
            avg_lum = sum(0.299*p[0] + 0.587*p[1] + 0.114*p[2] for p in rgbs) / len(rgbs)
            colored_px = [p for p in rgbs_sorted if (0.299*p[0] + 0.587*p[1] + 0.114*p[2]) > 24]

            # Pure dark background thresholding
            if len(colored_px) < 3 and max_lum < 34: continue
            if avg_lum < 21.0 and max_lum < 28: continue

            raw_cells[(c, r)] = {
                'c': c, 'r': r,
                'p90': p90, 'pmax': pmax, 'p25': p25, 'p10': p10,
                'max_lum': max_lum, 'avg_lum': avg_lum,
                'colored_px': colored_px
            }

    # Connected component analysis for floating particles
    cell_set = set(raw_cells.keys())
    visited = set()
    components = []

    for pt in sorted(cell_set):
        if pt in visited: continue
        comp = []
        q = [pt]
        visited.add(pt)
        while q:
            curr = q.pop()
            comp.append(curr)
            cx, cy = curr
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx == 0 and dy == 0: continue
                    nb = (cx + dx, cy + dy)
                    if nb in cell_set and nb not in visited:
                        visited.add(nb)
                        q.append(nb)
        components.append(comp)

    cell_to_comp = {pt: comp for comp in components for pt in comp}

    small_comp_peaks = set()
    for comp in components:
        if len(comp) <= 15:
            if len(comp) <= 6:
                peak = max(comp, key=lambda pt: raw_cells[pt]['max_lum'])
                small_comp_peaks.add(peak)
            else:
                sorted_comp = sorted(comp, key=lambda pt: raw_cells[pt]['max_lum'], reverse=True)
                for pt in sorted_comp[:3]:
                    small_comp_peaks.add(pt)

    all_cells = []

    for (c, r), data in raw_cells.items():
        comp = cell_to_comp[(c, r)]
        comp_size = len(comp)

        p90 = data['p90']
        p25 = data['p25']
        pmax = data['pmax']
        max_lum = data['max_lum']
        avg_lum = data['avg_lum']
        colored_px = data['colored_px']

        # 1. Floating glints
        if comp_size <= 15:
            if (c, r) in small_comp_peaks:
                fg_r, fg_g, fg_b = boost_color(p90[0], p90[1], p90[2])
                glyph = "+" if max_lum > 110 else "."
                all_cells.append({
                    'c': c, 'r': r, 'g': glyph,
                    'rgb': [fg_r, fg_g, fg_b]
                })
            continue

        # 2. Main artwork
        rf, gf, bf = p90[0] / 255.0, p90[1] / 255.0, p90[2] / 255.0
        h, s, v = colorsys.rgb_to_hsv(rf, gf, bf)
        is_orange = (rf > gf * 1.15 and rf > bf * 1.40 and s > 0.20)

        fg_r, fg_g, fg_b = boost_color(p90[0], p90[1], p90[2])
        stroke_lum = 0.299 * fg_r + 0.587 * fg_g + 0.114 * fg_b

        is_face = (50 <= c <= 72 and 14 <= r <= 32)
        is_paw = (54 <= c <= 70 and 38 <= r <= 42 and p90[0] > 120 and p90[1] > 110)
        is_tail_tip = (66 <= c <= 74 and 54 <= r <= 60 and p90[0] > 120 and p90[1] > 110)
        is_torso = (50 <= c <= 74 and 28 <= r <= 46 and not is_paw)
        is_eye_region = (54 <= c <= 66 and 20 <= r <= 23)

        has_bg = True
        bg_alpha = 0.72
        bg_r = int(p25[0] * 0.80)
        bg_g = int(p25[1] * 0.80)
        bg_b = int(p25[2] * 0.80)

        seed = int((c * 374761393) ^ (r * 668265263)) & 0xFFFFFFFF

        if is_face:
            # Check cheek blush
            is_blush = is_orange and (51 <= c <= 54 or 67 <= c <= 70) and (23 <= r <= 27)
            if is_blush:
                bg_r = min(200, max(130, int(fg_r * 0.65)))
                bg_g = min(140, max(70, int(fg_g * 0.50)))
                bg_b = min(100, max(45, int(fg_b * 0.40)))
                bg_alpha = 0.90
                fg_r, fg_g, fg_b = 245, 135, 75
                glyph = ORANGE_LEAF_GLYPHS[seed % len(ORANGE_LEAF_GLYPHS)]
            elif is_eye_region and avg_lum < 36:
                # Deep pupil
                bg_r, bg_g, bg_b = 20, 18, 16
                bg_alpha = 0.95
                if max_lum > 150:
                    fg_r, fg_g, fg_b = 255, 255, 255
                    glyph = "*"
                else:
                    fg_r, fg_g, fg_b = 48, 42, 38
                    glyph = ":"
            elif avg_lum >= 120 and stroke_lum >= 170:
                # Brightest highlights in face
                bg_r = min(255, int(p25[0] * 1.12 + 25))
                bg_g = min(255, int(p25[1] * 1.05 + 20))
                bg_b = max(10, int(p25[2] * 0.90 + 15))
                bg_alpha = 0.95
                fg_r, fg_g, fg_b = 248, 238, 222
                glyph = DENSE_BLOCK_GLYPHS[seed % len(DENSE_BLOCK_GLYPHS)]
            elif avg_lum >= 40:
                # Subtle mid-tones (around eyes, eyelids, nose bridge, muzzle, mouth curve)
                bg_r = max(24, int(p25[0] * 0.70))
                bg_g = max(22, int(p25[1] * 0.70))
                bg_b = max(20, int(p25[2] * 0.70))
                bg_alpha = 0.65
                fg_r, fg_g, fg_b = 248, 238, 222
                if stroke_lum > 140:
                    glyph = MID_GLYPHS[seed % len(MID_GLYPHS)]
                else:
                    ramp_idx = min(len(RAMP)-1, max(1, int((stroke_lum / 140) * (len(RAMP)-1))))
                    glyph = RAMP[ramp_idx]
            else:
                glyph = RAMP[min(len(RAMP)-1, max(1, int((stroke_lum / 120) * (len(RAMP)-1))))]
                if glyph in ('.', ':', '+', "'", ';') or stroke_lum < 50:
                    has_bg = False
        elif is_paw or is_tail_tip:
            bg_r = min(255, int(p25[0] * 1.12 + 20))
            bg_g = min(255, int(p25[1] * 1.05 + 18))
            bg_b = max(10, int(p25[2] * 0.90 + 12))
            bg_alpha = 0.95
            fg_r, fg_g, fg_b = 248, 238, 222
            glyph = DENSE_BLOCK_GLYPHS[seed % len(DENSE_BLOCK_GLYPHS)]
        elif is_torso and stroke_lum >= 45:
            norm = max(0.0, min(1.0, (stroke_lum - 40) / (200 - 40)))
            idx = min(len(TORSO_DENSE_RAMP) - 1, int((norm ** 0.70) * len(TORSO_DENSE_RAMP)))
            glyph = TORSO_DENSE_RAMP[idx]
            bg_alpha = 0.80
            bg_r = int(p25[0] * 0.75)
            bg_g = int(p25[1] * 0.75)
            bg_b = int(p25[2] * 0.75)
        elif is_orange and stroke_lum >= 50:
            leaf_norm = max(0.0, min(1.0, (stroke_lum - 45) / (220 - 45)))
            idx = min(len(ORANGE_LEAF_GLYPHS) - 1, int((leaf_norm ** 0.65) * (len(ORANGE_LEAF_GLYPHS) - 1)))
            glyph = ORANGE_LEAF_GLYPHS[idx]
            bg_r = max(int(p25[0] * 0.8), int(fg_r * 0.40))
            bg_g = max(int(p25[1] * 0.8), int(fg_g * 0.30))
            bg_b = max(int(p25[2] * 0.8), int(fg_b * 0.22))
            bg_alpha = 0.90
            fg_r, fg_g, fg_b = boost_color(p90[0], p90[1], p90[2], is_leaf=True)
        else:
            lum_norm = max(0.0, min(1.0, (stroke_lum - 35) / (255 - 35)))
            ramp_idx = 1 + int((lum_norm ** 0.70) * (len(RAMP) - 2))
            glyph = RAMP[ramp_idx]
            if glyph in ('.', ':', '+', "'", ';') or stroke_lum < 52 or len(colored_px) < 8:
                has_bg = False
            else:
                bg_alpha = 0.72

        tile = {
            'c': c, 'r': r, 'g': glyph,
            'rgb': [fg_r, fg_g, fg_b]
        }
        if has_bg:
            tile['bgRgb'] = [max(22, bg_r), max(20, bg_g), max(18, bg_b)]
            tile['bgAlpha'] = round(bg_alpha, 2)
        all_cells.append(tile)

    print(f"Generated {len(all_cells)} polished 1:1 image-to-ASCII tiles!")

    # Write TypeScript file
    ts_lines = [
        "/**",
        " * ASCII Monkey, Branch, and Ambient Art Data directly converted from reference image",
        f" * Total tiles: {len(all_cells)} (Strict 1:1 Square {GRID_COLS}x{GRID_ROWS} Grid)",
        " */",
        "",
        "export interface TileSpec {",
        "  c: number;",
        "  r: number;",
        "  g: string;",
        "  rgb: [number, number, number];",
        "  bgRgb?: [number, number, number];",
        "  bgAlpha?: number;",
        "}",
        "",
        f"export const REF_COLS = {GRID_COLS};",
        f"export const REF_ROWS = {GRID_ROWS};",
        f"export const MONKEY_ANCHOR_COL = {MONKEY_ANCHOR_COL};",
        f"export const MONKEY_ANCHOR_ROW = {MONKEY_ANCHOR_ROW};",
        "",
        "export const ART_TILES: TileSpec[] = ["
    ]

    for t in all_cells:
        g_escaped = json.dumps(t['g'])
        rgb_str = f"[{t['rgb'][0]}, {t['rgb'][1]}, {t['rgb'][2]}]"
        extra = ""
        if 'bgAlpha' in t:
            extra = f", bgRgb: [{t['bgRgb'][0]}, {t['bgRgb'][1]}, {t['bgRgb'][2]}], bgAlpha: {t['bgAlpha']}"
        ts_lines.append(f"  {{ c: {t['c']}, r: {t['r']}, g: {g_escaped}, rgb: {rgb_str}{extra} }},")

    ts_lines.append("];")
    ts_lines.append("")

    code = "\n".join(ts_lines)
    with open('src/components/pond/artData.ts', 'w') as f:
        f.write(code)

    print("Successfully wrote src/components/pond/artData.ts")

if __name__ == '__main__':
    convert()
