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

    GRID_COLS = 122
    cell_w = crop_w / GRID_COLS
    cell_h = cell_w * 1.26
    GRID_ROWS = int(crop_h / cell_h)

    print(f"Crop: {crop_w}x{crop_h} -> Grid: {GRID_COLS} cols x {GRID_ROWS} rows (cell: {cell_w:.2f}x{cell_h:.2f}px)")

    # Denser, blockier character ramp
    RAMP = " .':;+*=x#%8&$@"

    MONKEY_ANCHOR_COL = 51
    MONKEY_ANCHOR_ROW = 26

    def boost_color(r, g, b):
        rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
        h, s, v = colorsys.rgb_to_hsv(rf, gf, bf)
        
        # Warm tones (orange, amber, chestnut brown)
        if rf > gf and rf > bf:
            s = min(1.0, s * 1.40)
            v = min(1.0, v * 1.75)
        elif s < 0.22 and v > 0.40:
            # Clean warm-cream highlights (#f5ebe0 to #ffffff)
            v = min(1.0, v * 1.65)
            s = max(s, 0.08)
            h = 0.09
        else:
            s = min(1.0, s * 1.35)
            v = min(1.0, v * 1.65)
            
        br, bg, bb = colorsys.hsv_to_rgb(h, s, v)
        return int(round(br * 255)), int(round(bg * 255)), int(round(bb * 255))

    all_cells = []

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
            
            max_lum = 0.299*pmax[0] + 0.587*pmax[1] + 0.114*pmax[2]
            avg_lum = sum(0.299*p[0] + 0.587*p[1] + 0.114*p[2] for p in rgbs) / len(rgbs)
            
            colored_px = [p for p in rgbs if p[0] > 34 or p[1] > 34 or p[2] > 34]
            
            is_core_art = (
                (38 <= c <= 68 and 6 <= r <= 46) or      # monkey body & head
                (10 <= c <= 122 and 22 <= r <= 36) or    # main branch & twigs
                (70 <= c <= 122 and 12 <= r <= 28) or    # upper curving branch
                (46 <= c <= 72 and 28 <= r <= 52) or     # tail
                (88 <= c <= 100 and 40 <= r <= 48)       # floating cluster
            )
            
            # Background thresholding & noise reduction
            if is_core_art:
                if len(colored_px) < 4 or max_lum < 38:
                    if not (49 <= c <= 53 and 14 <= r <= 16 and max_lum > 30):
                        continue
            else:
                if len(colored_px) < 5 or max_lum < 58:
                    continue
                    
            # 1. Color sampling: 90th percentile of pixels with HSV boost
            sample_r, sample_g, sample_b = p90
            fg_r, fg_g, fg_b = boost_color(sample_r, sample_g, sample_b)
            stroke_lum = 0.299*fg_r + 0.587*fg_g + 0.114*fg_b
            
            # 2. Denser blocky character ramp mapping
            is_body = (38 <= c <= 68 and 6 <= r <= 50)
            if is_body:
                lum_norm = max(0.0, min(1.0, (stroke_lum - 40) / (255 - 40)))
                curved_norm = lum_norm ** 0.65
                ramp_idx = 1 + int(curved_norm * (len(RAMP) - 2))
            else:
                lum_norm = max(0.0, min(1.0, (stroke_lum - 45) / (255 - 45)))
                ramp_idx = 1 + int(lum_norm * (len(RAMP) - 2))
                
            glyph = RAMP[ramp_idx]
                
            # Ambient particles: single crisp '.' or '+'
            if not is_core_art:
                glyph = "+" if stroke_lum > 130 else "."
                
            bg_alpha = 0.0
            bg_rgb = [17, 17, 15]
            
            # Refine face shading
            if 42 <= c <= 60 and 8 <= r <= 23:
                # Dark eye sockets with bright catchlight
                if (c in (47, 48) and r in (15, 16)) or (c in (54, 55) and r in (14, 15)):
                    bg_alpha = 0.95
                    bg_rgb = [18, 16, 15]
                    if (c == 47 and r == 15) or (c == 54 and r == 14):
                        fg_r, fg_g, fg_b = 255, 255, 255
                        glyph = "."
                    else:
                        fg_r, fg_g, fg_b = 45, 38, 34
                        glyph = ":"
                # Bright warm-cream forehead highlight
                elif p90[0] > 155 and p90[1] > 145 and p90[2] > 135:
                    bg_alpha = 0.25
                    bg_rgb = [235, 215, 190]
                    fg_r, fg_g, fg_b = 248, 240, 230
                    glyph = "8" if (c + r) % 2 == 0 else "@"
                # Cheek blush
                elif c in (49, 50) and r == 17:
                    bg_alpha = 0.28
                    bg_rgb = [218, 106, 38]
                    fg_r, fg_g, fg_b = 232, 125, 62
                    glyph = "8"
            # Paw highlights on branch
            elif 45 <= c <= 58 and 25 <= r <= 28 and p90[0] > 145 and p90[1] > 135 and p90[2] > 125:
                fg_r, fg_g, fg_b = 248, 240, 230
                glyph = "8" if (c + r) % 2 == 0 else "%"
                bg_alpha = 0.20
                bg_rgb = [235, 215, 190]

            tile_dict = {
                'c': c, 'r': r, 'g': glyph,
                'rgb': [fg_r, fg_g, fg_b]
            }
            if bg_alpha > 0:
                tile_dict['bgAlpha'] = bg_alpha
                tile_dict['bgRgb'] = bg_rgb
                
            all_cells.append(tile_dict)

    print(f"Generated {len(all_cells)} polished image-to-ASCII cells!")

    # Write TypeScript file
    ts_lines = [
        "/**",
        " * ASCII Monkey, Branch, and Ambient Art Data directly converted from reference image",
        f" * Total tiles: {len(all_cells)} (Aspect-Adjusted {GRID_COLS}x{GRID_ROWS} Grid)",
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
