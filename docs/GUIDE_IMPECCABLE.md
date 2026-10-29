# GUIDE_IMPECCABLE — workflow design skill cho site này

[Impeccable](https://impeccable.style/docs) 4.8.0 (Apache-2.0): từ vựng thiết kế cho agent (`polish`,
`bolder`, `quieter`…), review (`critique`, `audit`) và detector chống "AI slop" — rule tất định,
không LLM, không API key.

Repo là site Astro: UI nằm trong `src/pages`, `src/layouts`, `src/components`, style ở `src/styles`.

## Vị trí file

| Đường dẫn | Vai trò |
|---|---|
| `.agents/skills/impeccable/` | Bản cài **duy nhất**; OpenCode, pi, omp, agy đều đọc skill từ `.agents/skills/` |
| `.opencode/commands/impeccable.md` | Slash command `/impeccable` (OpenCode) |
| `.agents/skills/impeccable/scripts/bin/` | Binary engine — **gitignore**, launcher tự tải lại vào `~/.impeccable/bin` |
| `.impeccable/config.json` | Config chung của project — **commit** |
| `PRODUCT.md`, `DESIGN.md` | Context do `init` / `document` sinh ra — **commit** |

Chỉ commit `config.json`, `design.json`, `surfaces/*.md`, `critique/*.md`; screenshot và cache trong
`.impeccable/` thì không.

## Config đã chốt cho repo này

`.impeccable/config.json` có hai thiết lập, đừng xoá mà không đọc lý do:

1. **Ignore `overused-font` cho `geist mono` / `geist sans`** — `AGENTS.md` đã chốt Geist là interface type,
   nên finding này là false positive. Font khác vẫn bị bắt bình thường.
2. **`detector.extensions = [{ "ext": ".astro", "engine": "html" }]`** — mặc định `.astro` chỉ được quét
   regex (không thấy tương phản, cỡ chữ); bật HTML engine để rule phần tử chạy trên markup `.astro`.
   Đánh đổi: mất rule regex và số dòng chính xác cho file `.astro`.

Đổi ý thì: `impeccable ignores remove-value overused-font "geist sans"`, và bỏ mảng `extensions`
để quay lại chế độ regex.

## Setup một lần

Chạy trong agent (OpenCode: `/impeccable init`; harness khác gọi skill theo cú pháp của nó):

```
/impeccable init        # hỏi vài câu → PRODUCT.md
/impeccable document    # tuỳ chọn: chốt visual system hiện có → DESIGN.md
```

Repo đã có luật UI trong `AGENTS.md` (Geist, hai theme paper/ink, không accent colour, hairline 1px,
trang đầu `100dvh`, pond canvas là decoration `aria-hidden`). Khi `init`/`document` chạy, **đọc mục đó
trước** — nó thắng mọi gợi ý mặc định của skill.

## Workflow

1. **Mục tiêu hẹp** — một component hoặc một section, không phải cả trang.
2. **Chọn động từ**, đừng mô tả mơ hồ.
3. **Đọc finding → sửa → quét lại.**
4. **Chỉ nhận "done"** khi detector sạch, hoặc từng finding còn lại có lý do ghi rõ.

| Nhóm | Lệnh | Dùng khi |
|---|---|---|
| Plan | `shape` | Thiết kế UX trước khi viết code |
| Review | `critique`, `audit` | Chấm điểm UX / báo cáo kỹ thuật (a11y, perf, responsive), xếp P0–P3 |
| Finish | `polish`, `harden`, `adapt`, `clarify`, `optimize`, `onboard` | Lượt cuối trước khi ship; edge case, i18n, màn nhỏ, copy, empty state |
| Steer | `bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout`, `animate`, `delight`, `overdrive` | Đổi gu trên một mục tiêu cụ thể |
| System | `document`, `extract` | Ghi lại design system, gom pattern lặp |
| Live | `live`, `generate` | Chọn element trên dev server và đổi variant tại chỗ |

## Detector — chạy được không cần agent

```bash
B=.agents/skills/impeccable/scripts/impeccable

$B detect src                  # file nguồn: regex rule + HTML engine cho .astro
$B detect --list-rules         # toàn bộ rule + id
$B detect --json src           # output máy đọc

# Rule cần trang đã render (tương phản thật, chữ quá nhỏ trên layout) chỉ chạy khi quét URL:
pnpm dev                       # astro dev, mặc định http://localhost:4321
$B detect http://localhost:4321
```

Exit code: `2` = có finding, `1` = không quét được mục tiêu, `0` = sạch.
Tắt rule cho một file: `<!-- impeccable-disable <rule-id>: <lý do> -->`.
Tha một giá trị có lý do: `$B ignores add-value <rule> <value> --reason "<lý do>"`.

## Quy tắc cho agent

- Chỉ sửa UI trong `src/`; không đụng `dist/`, `.astro/`, `test/` khi task là thiết kế.
- Theo `AGENTS.md` mục **UI rules** trước, rồi mới tới gợi ý của skill: hai theme, không accent colour,
  không shadow, không serif ngoài phone menu, pond canvas không mang nội dung.
- Sửa xong: chạy `$B detect src` và `pnpm build` (build chạy type-check Astro); trích finding vào báo cáo.
- Không thêm dependency cho một hiệu ứng; không commit `scripts/bin/`.
- `live` chỉ dùng trên checkout local + `pnpm dev`, không inject vào site đã deploy.

## Cập nhật

`update` tạo lại thư mục riêng cho từng harness, phải dồn về `.agents/` sau mỗi lần:

```bash
npx impeccable update --providers=opencode,pi,omp,antigravity --scope=project
rm -rf .agents/skills/impeccable
mv .agent/skills/impeccable .agents/skills/impeccable
rm -rf .opencode/skills .pi .omp .agent
npx impeccable doctor            # soi drift giữa artifact và version đang cài
```

Nếu phải sửa file `.astro`, kiểm tra lại sau `update` rằng `detector.extensions` vẫn còn trong
`.impeccable/config.json`.
