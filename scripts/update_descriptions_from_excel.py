#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET
import re
import subprocess
import os

EXCEL_PATH = '/Users/tgm-mac007/Downloads/mass_update_basic_info_515413675_20261013113216.xlsx'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_SQL_PATH = os.path.join(BASE_DIR, 'apps/api/src/main/resources/db/seed/demo-catalog.sql')

# 1. Read Excel
with zipfile.ZipFile(EXCEL_PATH) as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            text = ''.join(t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text)
            shared_strings.append(text)
            
    tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = []
    for r in tree.findall('.//s:row', ns):
        row_cells = {}
        for c in r.findall('s:c', ns):
            col_ref = ''.join(filter(str.isalpha, c.get('r', '')))
            val_el = c.find('s:v', ns)
            val = val_el.text if val_el is not None else None
            t = c.get('t')
            if t == 's' and val is not None:
                val = shared_strings[int(val)]
            row_cells[col_ref] = val
        rows.append(row_cells)

excel_map = {}
for r in rows:
    if r.get('A') and r.get('C') and r.get('A') not in ('et_title_product_id', 'basic_info', 'Mã Sản phẩm'):
        excel_map[r.get('A')] = {
            'name': r.get('C').strip(),
            'desc': (r.get('D') or '').strip()
        }

# Mapping of all 29 products in demo-catalog
slug_to_id = {
    'ao-khoac-the-thao': '27650805549',
    'ao-the-thao-hanabi': '27859896457',
    'ao-croptop-chong-nang': '26550800899',
    'quan-don-mong-cap-cao': '26659159473',
    'set-tat-hanabi-5-doi': '28557993206',
    'khau-trang-chong-nang-uv': '24781637751',
    'khau-trang-vanh-che-3d': '26351680887',
    'dep-da-xo-ngon': '26805807824',
    'tat-gau-co-ngan-tui-rut': '26950805683',
    'dan-nguc-silicon-5-doi': '28909378723',
    'dan-ti-silicone-hanabi': '27755810906',
    'ao-lot-su-duc-khong-gong': '43055083094',
    'ao-nguc-su-duc-nang': '44155073198',
    'dai-nit-bung-thong-hoi': '25578855486',
    'day-ao-nguc-trong-suot': '26207532609',
    'gen-nit-bung-latex': '23464541636',
    'quan-gen-nit-bung-moc-cai': '29266026912',
    'quan-nano-sinh-nhiet-tan-mo': '28500801140',
    'quan-lot-cotton-khong-duong-may': '28452888791',
    'quan-lot-mac-trong-vay': '24078585771',
    'quan-lot-air-tang-hinh': '24028782965',
    'quan-lot-cotton-khang-khuan': '29006539518',
    'quan-lot-duc-su-chong-lo': '25485343680',
    'quan-lot-hanabi-su-lua': '26508002349',
    'quan-lot-duc-su-tim': '24678937899',
    'quan-lot-su-cap-cao': '24228586531',
    'set-4-quan-lot-hop-qua': '24278849692',
    'set-6-quan-chip': '24278851360',
    'set-3-quan-lot-mat-lanh': '29858925678',
}

def clean_description(raw_desc, product_name):
    lines = raw_desc.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    cleaned = []
    
    noise_patterns = [
        r'^\s*khách sỹ liên hệ',
        r'^\s*chào mừng bạn đến với gian hàng',
        r'^\s*chào mừng bạn đến với cửa hàng',
        r'^\s*các cậu nhận được hàng',
        r'^\s*nếu có thắc mắc gì thêm',
        r'^\s*hãy theo dõi chúng tôi',
        r'^\s*chúng tôi nhận bán lẻ và bán sỉ',
        r'^\s*vì lý do hậu cần',
        r'^\s*hãy inbox hoặc gọi điện',
        r'^\s*đừng vội đánh giá',
        r'^\s*mong nàng khoan đánh giá',
        r'^\s*shop cảm ơn quý nàng',
        r'^\s*#',
        r'^\s*100%\s*thương hiệu mới',
        r'^\s*hàng hót cập bến',
        r'^\s*1️⃣\s*luôn luôn che tên sp',
        r'^\s*inbox\s*hoặc\s*gọi',
    ]

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if cleaned and cleaned[-1] != '':
                cleaned.append('')
            continue
            
        if any(re.search(pat, stripped, re.IGNORECASE) for pat in noise_patterns):
            continue
            
        cleaned.append(stripped)

    while cleaned and cleaned[0] == '':
        cleaned.pop(0)
    while cleaned and cleaned[-1] == '':
        cleaned.pop(-1)
        
    result = '\n'.join(cleaned)
    if not result:
        result = product_name
    return result

def extract_short_desc(cleaned_desc, product_name):
    paragraphs = [p.strip() for p in cleaned_desc.split('\n\n') if p.strip()]
    candidate = ''
    for p in paragraphs:
        first_line = p.split('\n')[0].strip()
        if not first_line.startswith(('1.', '2.', '3.', '4.', '5.', 'THÔNG TIN', 'MÔ TẢ', '-', '•', '*', 'Size')):
            candidate = first_line
            break
    if not candidate:
        candidate = f"{product_name} — chất liệu cao cấp, thoáng khí, co giãn thoải mái, đổi trả trong 30 ngày."
    
    # Strip emojis and leading symbols
    candidate = re.sub(r'^[^\w\s]+', '', candidate).strip()
    if len(candidate) > 155:
        candidate = candidate[:152] + '...'
    return candidate

# Generate updates
updates = []
for slug, pid in slug_to_id.items():
    if pid not in excel_map:
        print(f'Warning: {slug} with ID {pid} not in Excel!')
        continue
    item = excel_map[pid]
    cleaned = clean_description(item['desc'], item['name'])
    short = extract_short_desc(cleaned, item['name'])
    updates.append({
        'slug': slug,
        'pid': pid,
        'name': item['name'],
        'desc': cleaned,
        'short_desc': short
    })

print(f'Prepared {len(updates)} product updates.')

# 2. Update demo-catalog.sql
with open(SEED_SQL_PATH, 'r', encoding='utf-8') as f:
    sql_lines = f.readlines()

new_sql_lines = []
updated_count = 0

for line in sql_lines:
    # Match product insert line: ('66666666-6666-6666-6666-000000000001', 'Áo khoác thể thao zip', 'ao-khoac-the-thao', ...
    match = re.search(r"\('([0-9a-f-]+)',\s*'([^']+)',\s*'([a-z0-9-]+)',\s*'([^']*)',\s*'([^']*)',\s*('ACTIVE'|'DRAFT')", line)
    if match:
        p_id, p_name, p_slug, old_desc, old_short, p_status = match.groups()
        up = next((u for u in updates if u['slug'] == p_slug), None)
        if up:
            # Escape single quotes for SQL
            escaped_desc = up['desc'].replace("'", "''")
            escaped_short = up['short_desc'].replace("'", "''")
            # Reconstruct the line preserving rest of fields
            rest = line[match.end(5):]
            new_line = f"  ('{p_id}', '{p_name}', '{p_slug}', '{escaped_desc}', '{escaped_short}'{rest}"
            new_sql_lines.append(new_line)
            updated_count += 1
            continue
    new_sql_lines.append(line)

with open(SEED_SQL_PATH, 'w', encoding='utf-8') as f:
    f.writelines(new_sql_lines)

print(f'Updated {updated_count} / {len(updates)} product definitions in demo-catalog.sql.')

# 3. Apply to live PostgreSQL database
sql_commands = []
for up in updates:
    escaped_desc = up['desc'].replace("'", "''")
    escaped_short = up['short_desc'].replace("'", "''")
    sql_commands.append(f"UPDATE products SET description = '{escaped_desc}', short_description = '{escaped_short}' WHERE slug = '{up['slug']}';")

batch_sql = "\n".join(sql_commands)
tmp_sql = '/tmp/update_descriptions.sql'
with open(tmp_sql, 'w', encoding='utf-8') as f:
    f.write(batch_sql)

res = subprocess.run(['psql', '-d', 'myshop', '-f', tmp_sql], capture_output=True, text=True)
if res.returncode == 0:
    print('Successfully updated descriptions directly in PostgreSQL (myshop)!')
else:
    print('Failed to run psql:', res.stderr)

os.remove(tmp_sql)
print('Done!')
